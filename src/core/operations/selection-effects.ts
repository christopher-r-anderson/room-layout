import { msg } from '@lingui/core/macro'
import type { FurnitureItem } from '@/domain/furniture'
import { i18n } from '@/shared/i18n/i18n'
import { feedbackActions } from '../stores/feedback-store'
import { isEditorInteractive } from '../stores/editor-lifecycle-store'
import {
  selectionFocusActions,
  useSelectionFocusStore,
} from '../stores/selection-focus-store'
import { useSceneDocumentStore } from '../stores/scene-document-store'
import type { InteractionSource } from '../types/interaction.types'
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

// Reconciliation trackers: the values the subscription has already reconciled
// against. They live at module scope so reconciliation can run fully outside
// React.
let previousItems: FurnitureItem[] =
  useSceneDocumentStore.getState().history.present
let previousReconciledSelectedId: string | null = null
let previousSideEffectSelectedId: string | null =
  useSceneDocumentStore.getState().selectedId

function announceSelectionChange(options: {
  announceMode: SelectionAnnouncementMode
  announcePolite: (message: string) => void
  items: FurnitureItem[]
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

  const selectedName = selectedItem?.name

  if (announceMode === 'added') {
    if (selectedName) {
      announcePolite(i18n._(msg`${selectedName} added to room.`))
    }
    return
  }

  if (announceMode === 'panel-keyboard') {
    if (selectedName) {
      announcePolite(i18n._(msg`${selectedName} selected.`))
    }
    return
  }

  if (announceMode === 'canvas-keyboard') {
    if (selectedName) {
      announcePolite(
        i18n._(
          msg`${selectedName} selected. Press Shift+T to reach its actions.`,
        ),
      )
      return
    }

    if (previousSelectedId) {
      announcePolite(i18n._(msg`Selection cleared.`))
    }
    return
  }

  if (selectedName) {
    announcePolite(i18n._(msg`${selectedName} selected.`))
    return
  }

  if (previousSelectedId) {
    announcePolite(i18n._(msg`Selection cleared.`))
  }
}

/**
 * Imperative seam consumers call around scene mutations to record how the next
 * selection change should be reconciled (source, announce mode, outliner focus)
 * and to hand off post-delete focus intent. The reconciliation itself runs in
 * the subscription started by `startSelectionEffectsReconciler`.
 */
export const selectionEffects = {
  notePendingSelection: (behavior: PendingSelectionChangeBehavior | null) => {
    pendingSelectionChangeBehavior = behavior
  },
  notePendingSource: (source: InteractionSource) => {
    pendingSelectionSource = source
  },
  notePostDeleteOutlinerFocusIndex: (index: number | null) => {
    pendingPostDeleteOutlinerFocusIndex = index
  },
  notePostDeleteFocusTarget: (target: 'room-view' | 'outliner' | null) => {
    pendingDeleteFocusTarget = target
  },
  consumePostDeleteFocusTarget: (): 'room-view' | 'outliner' | null => {
    const target = pendingDeleteFocusTarget
    pendingDeleteFocusTarget = null
    return target
  },
}

export function resetSelectionEffects() {
  pendingSelectionSource = null
  pendingSelectionChangeBehavior = null
  pendingPostDeleteOutlinerFocusIndex = null
  pendingDeleteFocusTarget = null
}

function syncReconcilerTrackers() {
  const state = useSceneDocumentStore.getState()
  previousItems = state.history.present
  previousReconciledSelectedId = null
  previousSideEffectSelectedId = state.selectedId
}

// Reconciles selection metadata and screen-reader announcements after scene
// state changes. Mirrors the four commit-ordered effects the App-owned hook used
// to run; reads pending intent recorded via `selectionEffects` and the live
// outliner-focus request, then advances the trackers.
function reconcileSelectionEffects() {
  const state = useSceneDocumentStore.getState()
  const items = state.history.present
  const selectedId = state.selectedId
  const itemsChanged = items !== previousItems
  const outlinerFocusRequest =
    useSelectionFocusStore.getState().outlinerFocusRequest
  const editorInteractionsEnabled = isEditorInteractive()

  // Post-delete outliner focus runs without a readiness guard, matching the
  // original items-keyed effect.
  if (itemsChanged) {
    const preferredIndex = pendingPostDeleteOutlinerFocusIndex

    if (preferredIndex !== null) {
      pendingPostDeleteOutlinerFocusIndex = null
      selectionFocusActions.requestOutlinerFocus({
        token: Date.now(),
        preferredIndex,
      })
    }
  }

  if (editorInteractionsEnabled) {
    if (selectedId !== previousReconciledSelectedId) {
      const pendingSource = pendingSelectionSource
      pendingSelectionSource = null
      previousReconciledSelectedId = selectedId

      selectionFocusActions.setSelectedSource(
        selectedId === null ? null : pendingSource,
      )
    }

    const previousSelectedId = previousSideEffectSelectedId

    if (selectedId !== previousSelectedId) {
      const pendingBehavior = pendingSelectionChangeBehavior ?? {
        announceMode: 'default' as const,
        requestOutlinerFocus: false,
      }
      pendingSelectionChangeBehavior = null

      announceSelectionChange({
        announceMode: pendingBehavior.announceMode,
        announcePolite: feedbackActions.announcePolite,
        items,
        newId: selectedId,
        previousSelectedId,
      })

      if (
        pendingBehavior.requestOutlinerFocus &&
        outlinerFocusRequest === null
      ) {
        if (selectedId) {
          selectionFocusActions.requestOutlinerFocus({
            token: Date.now(),
            targetSelectedId: selectedId,
          })
        } else if (previousSelectedId) {
          selectionFocusActions.requestOutlinerFocus({
            token: Date.now(),
            focusContainer: true,
          })
        }
      }

      previousSideEffectSelectedId = selectedId
    } else if (itemsChanged) {
      // Selection unchanged but items did: drop now-stale pending behavior.
      pendingSelectionChangeBehavior = null
    }
  }

  previousItems = items
}

let reconcileScheduled = false

// Coalesces the synchronous scene-state writes a single handler emits (e.g. undo
// writes history and selection) into one deferred reconcile, and defers it past
// the handler so pending intent noted after the mutation has landed.
function scheduleReconcile() {
  if (reconcileScheduled) {
    return
  }

  reconcileScheduled = true
  queueMicrotask(() => {
    reconcileScheduled = false
    reconcileSelectionEffects()
  })
}

let activeUnsubscribe: (() => void) | null = null

/**
 * Subscribes selection-effects reconciliation to scene-state changes. Intended
 * to run once at app startup; idempotent so repeated calls reuse the active
 * subscription.
 */
export function startSelectionEffectsReconciler(): () => void {
  if (activeUnsubscribe) {
    return activeUnsubscribe
  }

  syncReconcilerTrackers()

  const unsubscribe = useSceneDocumentStore.subscribe(
    (state) => ({
      items: state.history.present,
      selectedId: state.selectedId,
    }),
    scheduleReconcile,
    {
      equalityFn: (a, b) =>
        a.items === b.items && a.selectedId === b.selectedId,
    },
  )

  activeUnsubscribe = () => {
    unsubscribe()
    activeUnsubscribe = null
  }

  return activeUnsubscribe
}
