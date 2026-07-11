import type { MessageDescriptor } from '@lingui/core'
import {
  focusActions,
  getFocusedSurface,
  getPendingFocus,
} from '@/core/stores/focus-store'
import { useSelectionStore } from '@/core/stores/selection-store'
import { subscribeToBlockingOverlay } from '@/core/stores/dialog-store'
import { feedback } from '@/core/stores/feedback-store'
import { getSelectedFurniture } from '@/core/operations/selected-furniture'
import { previewFromCanvasKeyboard } from '@/core/operations/preview-actions'
import { createReconciler } from '@/core/operations/reconciler'
import {
  directiveSurvivesLayout,
  resolveFocusIntent,
  type FocusAnnouncement,
  type FocusGestureOrigin,
  type FocusIntent,
  type FocusOriginSurface,
  type GestureModality,
} from '@/core/operations/focus-policy'
import {
  getHeaderLayoutMode,
  subscribeToHeaderLayoutMode,
} from '@/shared/layout/use-header-layout-mode'
import { i18n } from '@/shared/i18n/i18n'
import {
  FURNITURE_LIST_UNAVAILABLE_MESSAGE,
  NO_SELECTION_FOCUS_FALLBACK_MESSAGE,
  NO_SELECTION_FOCUS_UNAVAILABLE_MESSAGE,
} from '@/shared/messages/command-messages'

const ANNOUNCEMENT_MESSAGES: Record<FocusAnnouncement, MessageDescriptor> = {
  'no-selection-moved-to-list': NO_SELECTION_FOCUS_FALLBACK_MESSAGE,
  'no-selection': NO_SELECTION_FOCUS_UNAVAILABLE_MESSAGE,
  'list-unavailable': FURNITURE_LIST_UNAVAILABLE_MESSAGE,
}

export interface FocusGestureOriginInput {
  modality?: GestureModality
  /** Omit when the gesture site cannot name its surface; filled from the focus store. */
  surface?: FocusOriginSurface
}

// With no tracked claim, distinguish "focus fell to the body" (a repairable
// loss) from "focus survives on an untracked control" (never steal from it).
function readOriginSurface(): FocusOriginSurface {
  const focusedSurface = getFocusedSurface()

  if (focusedSurface !== null) {
    return focusedSurface
  }

  const activeElement = document.activeElement
  return activeElement === null || activeElement === document.body
    ? 'unknown'
    : 'chrome'
}

/**
 * The one focus-intent entry point: resolves the semantic intent against the
 * gesture origin and current layout, then either stores the directive for its
 * (mounted, by construction) surface to realize, or drops it — announcing
 * either way when the policy says so. Call after the producing mutation.
 */
export function requestFocus(
  intent: FocusIntent,
  originInput: FocusGestureOriginInput = {},
) {
  const origin: FocusGestureOrigin = {
    modality: originInput.modality ?? null,
    surface: originInput.surface ?? readOriginSurface(),
  }

  const resolution = resolveFocusIntent(intent, origin, {
    layout: getHeaderLayoutMode(),
    hasSelection: useSelectionStore.getState().selectedId !== null,
  })

  if (resolution.announcement !== null) {
    feedback.interactionUpdate(
      i18n._(ANNOUNCEMENT_MESSAGES[resolution.announcement]),
    )
  }

  // Last write wins for drops too: a "do not move focus" decision must
  // supersede any older directive that has not been realized yet.
  if (resolution.directive !== null) {
    focusActions.setPendingFocus(resolution.directive)
  } else {
    focusActions.clearPendingFocus()
  }
}

// The pane focus commands (Shift+R/O/I/T): plain surface intents, plus the
// scene command's preview side effect. The resolver owns the no-selection
// fallbacks and their announcements.
export function focusScene() {
  requestFocus({ kind: 'surface', surface: 'scene' })

  const selectedFurniture = getSelectedFurniture()

  if (selectedFurniture !== null) {
    previewFromCanvasKeyboard(selectedFurniture.id)
  }
}

export function focusItemCollection() {
  requestFocus({ kind: 'surface', surface: 'item-collection' })
}

export function focusInspector() {
  requestFocus({ kind: 'surface', surface: 'inspector' })
}

export function focusItemActions() {
  requestFocus({ kind: 'surface', surface: 'item-actions' })
}

/**
 * Clears a pending focus directive when the world changes out from under it.
 * A blocking overlay opening clears unconditionally (the dialog owns focus
 * now, and its close-restore handles the return); a layout flip re-validates
 * the directive against the policy and clears only what the new layout cannot
 * realize, so e.g. a queued scene repair survives a resize. Idempotent;
 * returns an unsubscribe.
 */
export const startPendingFocusReconciler = createReconciler(() => [
  subscribeToBlockingOverlay((isOpen, wasOpen) => {
    if (!isOpen || wasOpen) {
      return
    }

    focusActions.clearPendingFocus()
  }),
  subscribeToHeaderLayoutMode(() => {
    const pending = getPendingFocus()

    if (pending === null) {
      return
    }

    if (directiveSurvivesLayout(pending, getHeaderLayoutMode())) {
      return
    }

    focusActions.clearPendingFocus()
  }),
])
