import { msg } from '@lingui/core/macro'
import type { FurnitureItem } from '@/domain/furniture'
import { i18n } from '@/shared/i18n/i18n'
import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import {
  useSelectionStore,
  type InteractionSource,
} from '@/core/stores/selection-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { clearPreviewOnCanvasMiss } from '@/core/operations/preview-actions'
import { sceneCommands } from '@/core/scene-commands'
import {
  clearSelection as clearDocumentSelection,
  selectById as selectDocumentById,
} from './selection-mutations'
import type { SelectByIdResult } from '@/core/scene.types'

export type SelectionAnnouncementMode =
  | 'default'
  | 'added'
  | 'canvas-keyboard'
  | 'panel-keyboard'

/**
 * Announces a selection change on the polite live region. Runs synchronously
 * with the mutation that caused it, so the caller supplies the mode it knows
 * (which keyboard surface, an add) and the pre-mutation selection.
 */
export function announceSelectionChange(options: {
  announceMode: SelectionAnnouncementMode
  items: FurnitureItem[]
  newId: string | null
  previousSelectedId: string | null
}) {
  const { announceMode, items, newId, previousSelectedId } = options

  const selectedItem = newId
    ? (items.find((item) => item.id === newId) ?? null)
    : null

  const selectedName = selectedItem?.name

  if (announceMode === 'added') {
    if (selectedName) {
      feedbackActions.announcePolite(
        i18n._(msg`${selectedName} added to room.`),
      )
    }
    return
  }

  if (announceMode === 'canvas-keyboard') {
    if (selectedName) {
      feedbackActions.announcePolite(
        i18n._(
          msg`${selectedName} selected. Press Shift+T to reach its actions.`,
        ),
      )
      return
    }

    if (previousSelectedId) {
      feedbackActions.announcePolite(i18n._(msg`Selection cleared.`))
    }
    return
  }

  if (selectedName) {
    feedbackActions.announcePolite(i18n._(msg`${selectedName} selected.`))
    return
  }

  if (previousSelectedId) {
    feedbackActions.announcePolite(i18n._(msg`Selection cleared.`))
  }
}

// The canvas-pointer path (click or drag start on an item). Called by the
// scene's input mapping; the pointer event implies a mounted scene, so no
// readiness guard.
export function selectByCanvasPointer(id: string) {
  const previousSelectedId = useSelectionStore.getState().selectedId
  const result = selectDocumentById(id, 'canvas-pointer')

  if (result.ok && previousSelectedId !== id) {
    announceSelectionChange({
      announceMode: 'default',
      items: useSceneDocumentStore.getState().history.present,
      newId: id,
      previousSelectedId,
    })
  }
}

export function selectById(
  id: string | null,
  source?: InteractionSource,
): SelectByIdResult {
  if (!sceneCommands.isSceneReady()) {
    return {
      ok: false,
      status: 'not-found',
    }
  }

  const previousSelectedId = useSelectionStore.getState().selectedId
  const result = selectDocumentById(id, source ?? null)
  feedbackActions.clearStatusMessage()

  if (result.ok && previousSelectedId !== id) {
    announceSelectionChange({
      announceMode:
        source === 'panel-keyboard'
          ? 'panel-keyboard'
          : source === 'canvas-keyboard'
            ? 'canvas-keyboard'
            : 'default',
      items: useSceneDocumentStore.getState().history.present,
      newId: id,
      previousSelectedId,
    })
  }

  return result
}

export function clearSelection() {
  if (!sceneCommands.isSceneReady()) {
    return
  }

  const previousSelectedId = useSelectionStore.getState().selectedId
  clearDocumentSelection()
  feedbackActions.clearStatusMessage()

  // The mutation no-ops mid-drag; only announce a clear that landed.
  if (
    previousSelectedId !== null &&
    useSelectionStore.getState().selectedId === null
  ) {
    announceSelectionChange({
      announceMode: 'default',
      items: useSceneDocumentStore.getState().history.present,
      newId: null,
      previousSelectedId,
    })
  }
}

/**
 * Dismisses what is active in the room view: clears the selection and the
 * canvas-miss preview together. Shared by the Escape ("clear-selection")
 * command and a canvas pointer-miss so both paths behave identically.
 */
export function clearCanvasSelection() {
  clearSelection()
  clearPreviewOnCanvasMiss()
}
