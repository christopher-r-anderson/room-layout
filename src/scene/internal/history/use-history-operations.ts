import { useCallback } from 'react'
import type { FurnitureInstance } from '@/domain/furniture'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import {
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/scene-contracts'
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import { buildRestoredSceneHistory } from './restored-scene-history'
import { getLoadedCollectionScenes } from '../furniture/collection-scene-registry'

interface UseHistoryOperationsOptions {
  isDragging: boolean
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
}

// Undo/redo/restore service handlers - the imperative surface, kept apart from
// rendering.
export function useHistoryOperations({
  isDragging,
  catalog,
  collections,
}: UseHistoryOperationsOptions) {
  const undo = useCallback(() => {
    const { history, selectedId } = useSceneDocumentStore.getState()
    const undoResult = undoSceneHistory({ history, selectedId, isDragging })

    if (!undoResult.didChange) {
      return false
    }

    sceneDocumentActions.setHistory(undoResult.history)
    sceneDocumentActions.setSelectedId(undoResult.selectedId)

    return true
  }, [isDragging])

  const redo = useCallback(() => {
    const { history, selectedId } = useSceneDocumentStore.getState()
    const redoResult = redoSceneHistory({ history, selectedId, isDragging })

    if (!redoResult.didChange) {
      return false
    }

    sceneDocumentActions.setHistory(redoResult.history)
    sceneDocumentActions.setSelectedId(redoResult.selectedId)

    return true
  }, [isDragging])

  const restoreInitialLayout = useCallback(
    (instances: FurnitureInstance[]) => {
      const restoredState = buildRestoredSceneHistory({
        instances,
        catalog,
        collections,
        // The gated collections are guaranteed loaded before readiness fires
        // (which is when restore runs), so reading fresh here is safe.
        sourceScenesByPath: getLoadedCollectionScenes(),
      })

      sceneDocumentActions.setInstanceIdCounter(restoredState.instanceIdSeed)
      sceneDocumentActions.setHistory(restoredState.history)
      sceneDocumentActions.setSelectedId(null)
    },
    [catalog, collections],
  )

  return { undo, redo, restoreInitialLayout }
}
