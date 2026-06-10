import { useCallback, useEffect, useMemo, useRef } from 'react'
import {
  selectionMetaActions,
  useOutlinerFocusRequest,
} from '@/editor-state/selection-meta-store'
import { useItems, useSceneStateStore } from '@/editor-state/scene-state-store'
import type { InteractionSource } from '@/app/scene-interaction.types'
import type {
  PendingSelectionChangeBehavior,
  SelectionAnnouncementMode,
} from './_shared/selection-effects.types'

interface AnnouncementsApi {
  announcePolite: (message: string) => void
}

export interface SelectionEffectsApi {
  notePendingSelection(behavior: PendingSelectionChangeBehavior | null): void
  notePendingSource(source: InteractionSource): void
  notePostDeleteOutlinerFocusIndex(index: number | null): void
  notePostDeleteFocusTarget(target: 'room-view' | 'outliner' | null): void
  consumePostDeleteFocusTarget(): 'room-view' | 'outliner' | null
}

interface SelectionEffectsControllerOptions {
  announcements: AnnouncementsApi
  editorInteractionsEnabled: boolean
}

function announceSelectionChange(options: {
  announceMode: SelectionAnnouncementMode
  announcePolite: (message: string) => void
  items: ReturnType<typeof useItems>
  newId: string | null
  previousSelectedId: string | null
}) {
  const { announceMode, announcePolite, items, newId, previousSelectedId } =
    options

  if (announceMode === 'suppress') {
    return
  }

  const selectedItem = newId
    ? (items.find((item) => item.id === newId) ?? null)
    : null

  if (announceMode === 'added') {
    if (selectedItem) {
      announcePolite(`${selectedItem.name} added to room.`)
    }
    return
  }

  if (announceMode === 'panel-keyboard') {
    if (selectedItem) {
      announcePolite(
        `${selectedItem.name} selected. Press Shift+Tab to reach selected item actions and details.`,
      )
    }
    return
  }

  if (announceMode === 'canvas-keyboard') {
    if (selectedItem) {
      announcePolite(
        `${selectedItem.name} selected. Press Tab to reach selected item actions and details.`,
      )
      return
    }

    if (previousSelectedId) {
      announcePolite('Selection cleared.')
    }
    return
  }

  if (selectedItem) {
    announcePolite(`${selectedItem.name} selected.`)
    return
  }

  if (previousSelectedId) {
    announcePolite('Selection cleared.')
  }
}

export function useSelectionEffectsController({
  announcements,
  editorInteractionsEnabled,
}: SelectionEffectsControllerOptions): SelectionEffectsApi {
  const items = useItems()
  const selectedId = useSceneStateStore((state) => state.selectedId)
  const outlinerFocusRequest = useOutlinerFocusRequest()
  const { announcePolite } = announcements

  const pendingSelectionSourceRef = useRef<InteractionSource>(null)
  const previousReconciledSelectedIdRef = useRef<string | null>(null)
  const previousSelectionSideEffectSelectedIdRef = useRef<string | null>(
    selectedId,
  )
  const pendingPostDeleteOutlinerFocusIndexRef = useRef<number | null>(null)
  const pendingSelectionChangeBehaviorRef =
    useRef<PendingSelectionChangeBehavior | null>(null)
  const pendingDeleteFocusTargetRef = useRef<'room-view' | 'outliner' | null>(
    null,
  )

  useEffect(() => {
    const preferredIndex = pendingPostDeleteOutlinerFocusIndexRef.current

    if (preferredIndex === null) {
      return
    }

    pendingPostDeleteOutlinerFocusIndexRef.current = null
    selectionMetaActions.requestOutlinerFocus({
      token: Date.now(),
      preferredIndex,
    })
  }, [items])

  useEffect(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    if (selectedId === previousReconciledSelectedIdRef.current) {
      return
    }

    const pendingSource = pendingSelectionSourceRef.current
    pendingSelectionSourceRef.current = null
    previousReconciledSelectedIdRef.current = selectedId

    selectionMetaActions.setSelectedSource(
      selectedId === null ? null : pendingSource,
    )
  }, [editorInteractionsEnabled, selectedId])

  useEffect(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    const previousSelectedId = previousSelectionSideEffectSelectedIdRef.current

    if (selectedId === previousSelectedId) {
      return
    }

    const pendingBehavior = pendingSelectionChangeBehaviorRef.current ?? {
      announceMode: 'default' as const,
      requestOutlinerFocus: false,
    }
    pendingSelectionChangeBehaviorRef.current = null

    announceSelectionChange({
      announceMode: pendingBehavior.announceMode,
      announcePolite,
      items,
      newId: selectedId,
      previousSelectedId,
    })

    if (pendingBehavior.requestOutlinerFocus && outlinerFocusRequest === null) {
      if (selectedId) {
        selectionMetaActions.requestOutlinerFocus({
          token: Date.now(),
          targetSelectedId: selectedId,
        })
      } else if (previousSelectedId) {
        selectionMetaActions.requestOutlinerFocus({
          token: Date.now(),
          focusContainer: true,
        })
      }
    }

    previousSelectionSideEffectSelectedIdRef.current = selectedId
  }, [
    announcePolite,
    editorInteractionsEnabled,
    items,
    outlinerFocusRequest,
    selectedId,
  ])

  useEffect(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    if (selectedId !== previousSelectionSideEffectSelectedIdRef.current) {
      return
    }

    pendingSelectionChangeBehaviorRef.current = null
  }, [editorInteractionsEnabled, items, selectedId])

  const notePendingSelection = useCallback(
    (behavior: PendingSelectionChangeBehavior | null) => {
      pendingSelectionChangeBehaviorRef.current = behavior
    },
    [],
  )

  const notePendingSource = useCallback((source: InteractionSource) => {
    pendingSelectionSourceRef.current = source
  }, [])

  const notePostDeleteOutlinerFocusIndex = useCallback(
    (index: number | null) => {
      pendingPostDeleteOutlinerFocusIndexRef.current = index
    },
    [],
  )

  const notePostDeleteFocusTarget = useCallback(
    (target: 'room-view' | 'outliner' | null) => {
      pendingDeleteFocusTargetRef.current = target
    },
    [],
  )

  const consumePostDeleteFocusTarget = useCallback(() => {
    const target = pendingDeleteFocusTargetRef.current
    pendingDeleteFocusTargetRef.current = null
    return target
  }, [])

  return useMemo(
    () => ({
      notePendingSelection,
      notePendingSource,
      notePostDeleteOutlinerFocusIndex,
      notePostDeleteFocusTarget,
      consumePostDeleteFocusTarget,
    }),
    [
      notePendingSelection,
      notePendingSource,
      notePostDeleteOutlinerFocusIndex,
      notePostDeleteFocusTarget,
      consumePostDeleteFocusTarget,
    ],
  )
}
