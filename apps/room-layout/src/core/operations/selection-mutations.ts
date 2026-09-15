import { useSceneDocumentStore } from '@/core/stores/scene-document-store'
import {
  sceneSessionActions,
  useSceneSessionStore,
} from '@/core/stores/scene-session-store'
import {
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
import type { SelectByIdResult } from '@/core/scene.types'

// Selection session mutations, blocked mid-drag. A selection change also drops
// any hover preview so the two never point at each other's item.

/**
 * The one write path for the selection pointer: clears the hover preview when
 * the pointer changes, then writes the id. Every mutation that moves the
 * selection (including add/delete/undo/restore) goes through here.
 */
export function applySelection(id: string | null) {
  if (useSelectionStore.getState().selectedId !== id) {
    sceneSessionActions.setPreviewedId(null)
  }
  selectionActions.setSelection(id)
}

export function clearSelection() {
  if (useSceneSessionStore.getState().isDragging) {
    return
  }

  applySelection(null)
}

export function selectById(id: string | null): SelectByIdResult {
  const { history } = useSceneDocumentStore.getState()
  const { isDragging } = useSceneSessionStore.getState()

  if (isDragging) {
    return {
      ok: false,
      status: 'blocked-dragging',
    }
  }

  if (id === null) {
    applySelection(null)
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

  applySelection(id)

  return {
    ok: true,
    status: 'selected',
  }
}
