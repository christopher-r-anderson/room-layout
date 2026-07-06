import {
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import {
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
import type { SelectByIdResult } from '@/core/scene.types'
import type { InteractionSource } from '@/core/types/interaction.types'

// Selection session mutations, blocked mid-drag. The pointer and its
// provenance are written atomically; a selection change also drops any hover
// preview so the two never point at each other's item.

/**
 * The one write path for the selection pointer: clears the hover preview when
 * the pointer changes, then writes id + provenance atomically. Every mutation
 * that moves the selection (including add/delete/undo/restore) goes through
 * here.
 */
export function applySelection(id: string | null, source: InteractionSource) {
  if (useSelectionStore.getState().selectedId !== id) {
    sceneDocumentActions.setPreviewedId(null)
  }
  selectionActions.setSelection(id, source)
}

export function clearSelection() {
  if (useSceneDocumentStore.getState().isDragging) {
    return
  }

  applySelection(null, null)
}

export function selectById(
  id: string | null,
  source: InteractionSource = null,
): SelectByIdResult {
  const { history, isDragging } = useSceneDocumentStore.getState()

  if (isDragging) {
    return {
      ok: false,
      status: 'blocked-dragging',
    }
  }

  if (id === null) {
    applySelection(null, null)
    return {
      ok: true,
      status: 'cleared',
    }
  }

  const itemExists = history.present.some((item) => item.id === id)

  if (!itemExists) {
    return {
      ok: false,
      status: 'not-found',
    }
  }

  applySelection(id, source)

  return {
    ok: true,
    status: 'selected',
  }
}
