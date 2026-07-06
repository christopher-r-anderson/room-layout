import { sceneCommands } from '@/core/scene-commands'
import { feedbackActions } from '@/core/stores/feedback-store'
import { selectById } from '@/core/operations/selection-actions'
import { previewFromCanvasKeyboard } from '@/core/operations/preview-actions'
import { getPreviewedId } from '@/core/operations/previewed-id'
import {
  resolveBrowseTarget,
  sortSpatially,
  type BrowseDirection,
} from '@/core/operations/canvas-keyboard-navigation'

/**
 * Keyboard navigation of the room: browse moves the preview through the
 * spatially-ordered scene items, select commits the current preview. The current
 * preview is read from the store via getPreviewedId, which reflects the
 * synchronous setPreviewedId write — so a quick browse-then-select sees the fresh
 * value without a ref.
 */

export function browseCanvasPreview(direction: BrowseDirection) {
  const snapshot = sceneCommands.getSnapshot()
  if (!snapshot || snapshot.items.length === 0) {
    return
  }

  const orderedIds = sortSpatially(snapshot.items)
  const nextId = resolveBrowseTarget(orderedIds, getPreviewedId(), direction)
  if (!nextId) {
    return
  }

  previewFromCanvasKeyboard(nextId)

  const item = snapshot.items.find((sceneItem) => sceneItem.id === nextId)
  if (item) {
    feedbackActions.announcePolite(item.name)
  }
}

export function selectCanvasPreviewed() {
  const id = getPreviewedId()
  if (!id) {
    return
  }

  selectById(id, 'canvas-keyboard')
  previewFromCanvasKeyboard(null)
}
