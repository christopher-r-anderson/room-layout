import type { FurnitureInstance } from '@/domain/furniture'
import {
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { useAssetsStore } from '@/core/stores/assets-store'
import { getCollectionNodeDefaults } from '@/core/stores/collection-scene-registry'
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import { buildRestoredSceneHistory } from './restored-scene-history'

// Undo/redo/restore document mutations.

export function undo(): boolean {
  const { history, selectedId, isDragging } = useSceneDocumentStore.getState()
  const undoResult = undoSceneHistory({ history, selectedId, isDragging })

  if (!undoResult.didChange) {
    return false
  }

  sceneDocumentActions.setHistory(undoResult.history)
  sceneDocumentActions.setSelectedId(undoResult.selectedId)

  return true
}

export function redo(): boolean {
  const { history, selectedId, isDragging } = useSceneDocumentStore.getState()
  const redoResult = redoSceneHistory({ history, selectedId, isDragging })

  if (!redoResult.didChange) {
    return false
  }

  sceneDocumentActions.setHistory(redoResult.history)
  sceneDocumentActions.setSelectedId(redoResult.selectedId)

  return true
}

export function restoreInitialLayout(instances: FurnitureInstance[]) {
  const { catalog, collections } = useAssetsStore.getState()
  const restoredState = buildRestoredSceneHistory({
    instances,
    catalog,
    collections,
    // The gated collections are guaranteed registered before readiness fires
    // (which is when restore runs), so reading fresh here is safe.
    nodeDefaultsByPath: getCollectionNodeDefaults(),
  })

  sceneDocumentActions.setInstanceIdCounter(restoredState.instanceIdSeed)
  sceneDocumentActions.setHistory(restoredState.history)
  sceneDocumentActions.setSelectedId(null)
}
