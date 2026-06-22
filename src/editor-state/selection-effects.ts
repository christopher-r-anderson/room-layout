import { useEffect, useRef } from 'react'
import { announcementActions } from './announcement-store'
import { useEditorInteractionsEnabled } from './editor-runtime-store'
import {
  selectionMetaActions,
  useOutlinerFocusRequest,
} from './selection-meta-store'
import { useItems, useSceneStateStore } from './scene-state-store'
import type { InteractionSource } from './types/interaction.types'
import type {
  PendingSelectionChangeBehavior,
  SelectionAnnouncementMode,
} from './selection-effects.types'

// Imperative scratch cells live at module scope rather than in store state: they
// record pending selection intent between a synchronous scene mutation and the
// deferred reconciliation that reads them. Nothing renders from them; consumers
// write them around their mutations via `selectionEffects`.
let pendingSelectionSource: InteractionSource = null
let pendingSelectionChangeBehavior: PendingSelectionChangeBehavior | null = null
let pendingPostDeleteOutlinerFocusIndex: number | null = null
let pendingDeleteFocusTarget: 'room-view' | 'outliner' | null = null

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
      announcePolite(`${selectedItem.name} selected.`)
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

/**
 * Imperative seam consumers call around scene mutations to record how the next
 * selection change should be reconciled (source, announce mode, outliner focus)
 * and to hand off post-delete focus intent. The reconciliation itself runs in
 * `useSelectionEffectsReconciler`.
 */
export const selectionEffects = {
  notePendingSelection(behavior: PendingSelectionChangeBehavior | null) {
    pendingSelectionChangeBehavior = behavior
  },
  notePendingSource(source: InteractionSource) {
    pendingSelectionSource = source
  },
  notePostDeleteOutlinerFocusIndex(index: number | null) {
    pendingPostDeleteOutlinerFocusIndex = index
  },
  notePostDeleteFocusTarget(target: 'room-view' | 'outliner' | null) {
    pendingDeleteFocusTarget = target
  },
  consumePostDeleteFocusTarget(): 'room-view' | 'outliner' | null {
    const target = pendingDeleteFocusTarget
    pendingDeleteFocusTarget = null
    return target
  },
}

export type SelectionEffectsApi = typeof selectionEffects

export function resetSelectionEffects() {
  pendingSelectionSource = null
  pendingSelectionChangeBehavior = null
  pendingPostDeleteOutlinerFocusIndex = null
  pendingDeleteFocusTarget = null
}

/**
 * Reconciles selection metadata and screen-reader announcements after scene
 * state changes. The effects stay deferred past the synchronous handler that
 * mutated the scene, so the pending intent recorded via `selectionEffects` has
 * already landed by the time they read the module cells.
 */
export function useSelectionEffectsReconciler(): void {
  const items = useItems()
  const selectedId = useSceneStateStore((state) => state.selectedId)
  const outlinerFocusRequest = useOutlinerFocusRequest()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()

  const previousReconciledSelectedIdRef = useRef<string | null>(null)
  const previousSelectionSideEffectSelectedIdRef = useRef<string | null>(
    selectedId,
  )

  useEffect(() => {
    const preferredIndex = pendingPostDeleteOutlinerFocusIndex

    if (preferredIndex === null) {
      return
    }

    pendingPostDeleteOutlinerFocusIndex = null
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

    const pendingSource = pendingSelectionSource
    pendingSelectionSource = null
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

    const pendingBehavior = pendingSelectionChangeBehavior ?? {
      announceMode: 'default' as const,
      requestOutlinerFocus: false,
    }
    pendingSelectionChangeBehavior = null

    announceSelectionChange({
      announceMode: pendingBehavior.announceMode,
      announcePolite: announcementActions.announcePolite,
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
  }, [editorInteractionsEnabled, items, outlinerFocusRequest, selectedId])

  useEffect(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    if (selectedId !== previousSelectionSideEffectSelectedIdRef.current) {
      return
    }

    pendingSelectionChangeBehavior = null
  }, [editorInteractionsEnabled, items, selectedId])
}
