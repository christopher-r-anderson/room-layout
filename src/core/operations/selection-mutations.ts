import {
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import type { SelectByIdResult } from '@/core/scene.types'

// Programmatic selection mutations, blocked mid-drag. The canvas-pointer path
// stays in the scene layer (it maps input, then writes the same store).

export function clearSelection() {
  if (useSceneDocumentStore.getState().isDragging) {
    return
  }

  sceneDocumentActions.setSelectedId(null)
}

export function selectById(id: string | null): SelectByIdResult {
  const { history, isDragging } = useSceneDocumentStore.getState()

  if (isDragging) {
    return {
      ok: false,
      status: 'blocked-dragging',
    }
  }

  if (id === null) {
    sceneDocumentActions.setSelectedId(null)
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

  sceneDocumentActions.setSelectedId(id)

  return {
    ok: true,
    status: 'selected',
  }
}
