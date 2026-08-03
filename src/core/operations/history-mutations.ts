import type { FurnitureInstance } from '@/domain/furniture'
import {
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { useSceneSessionStore } from '@/core/stores/scene-session-store'
import { useSelectionStore } from '@/core/stores/selection-store'
import { applySelection } from './selection-mutations'
import { useAssetsStore } from '@/core/stores/assets-store'
import { getCollectionNodeDefaults } from '@/core/stores/collection-scene-registry'
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import { buildRestoredSceneHistory } from './restored-scene-history'

export function undo(): boolean {
  const { history } = useSceneDocumentStore.getState()
  const { isDragging } = useSceneSessionStore.getState()
  const { selectedId } = useSelectionStore.getState()
  const undoResult = undoSceneHistory({ history, selectedId, isDragging })

  if (!undoResult.didChange) {
    return false
  }

  sceneDocumentActions.setHistory(undoResult.history)
  applySelection(undoResult.selectedId)

  return true
}

export function redo(): boolean {
  const { history } = useSceneDocumentStore.getState()
  const { isDragging } = useSceneSessionStore.getState()
  const { selectedId } = useSelectionStore.getState()
  const redoResult = redoSceneHistory({ history, selectedId, isDragging })

  if (!redoResult.didChange) {
    return false
  }

  sceneDocumentActions.setHistory(redoResult.history)
  applySelection(redoResult.selectedId)

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
  applySelection(null)
}
