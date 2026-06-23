import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { announcementActions } from '../stores/announcement-store'
import { editorLifecycleStore } from '../stores/editor-lifecycle-store'
import {
  selectionMetaActions,
  selectionMetaStore,
} from '../stores/selection-meta-store'
import { sceneDocumentStore } from '../stores/scene-document-store'
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
let previousItems: FurnitureItem[] = sceneDocumentStore.getState().history.present
let previousReconciledSelectedId: string | null = null
let previousSideEffectSelectedId: string | null =
  sceneDocumentStore.getState().selectedId

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
  const state = sceneDocumentStore.getState()
  previousItems = state.history.present
  previousReconciledSelectedId = null
  previousSideEffectSelectedId = state.selectedId
}

// Reconciles selection metadata and screen-reader announcements after scene
// state changes. Mirrors the four commit-ordered effects the App-owned hook used
// to run; reads pending intent recorded via `selectionEffects` and the live
// outliner-focus request, then advances the trackers.
function reconcileSelectionEffects() {
  const state = sceneDocumentStore.getState()
  const items = state.history.present
  const selectedId = state.selectedId
  const itemsChanged = items !== previousItems
  const outlinerFocusRequest =
    selectionMetaStore.getState().outlinerFocusRequest
  const editorInteractionsEnabled =
    editorLifecycleStore.getState().startupPhase === 'ready'

  // Post-delete outliner focus runs without a readiness guard, matching the
  // original items-keyed effect.
  if (itemsChanged) {
    const preferredIndex = pendingPostDeleteOutlinerFocusIndex

    if (preferredIndex !== null) {
      pendingPostDeleteOutlinerFocusIndex = null
      selectionMetaActions.requestOutlinerFocus({
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

      selectionMetaActions.setSelectedSource(
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
        announcePolite: announcementActions.announcePolite,
        items,
        newId: selectedId,
        previousSelectedId,
      })

      if (
        pendingBehavior.requestOutlinerFocus &&
        outlinerFocusRequest === null
      ) {
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

  const unsubscribe = sceneDocumentStore.subscribe(
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
