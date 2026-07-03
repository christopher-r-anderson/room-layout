import { useCallback } from 'react'
import type { FurnitureInstance } from '@/domain/furniture'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import {
  sceneDocumentActions,
  sceneDocumentStore,
} from '@/core/scene-contracts'
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import { buildRestoredSceneHistory } from './restored-scene-history'
import { getLoadedCollectionScenes } from '../furniture/collection-scenes-store'

interface UseHistoryOperationsOptions {
  isDragging: boolean
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
}

// Undo/redo/restore service handlers. Each reads the authoritative history from
// the document store, runs the pure history transition, and writes the result
// back. Extracted from the Scene component so the imperative surface lives apart
// from rendering.
export function useHistoryOperations({
  isDragging,
  catalog,
  collections,
}: UseHistoryOperationsOptions) {
  const undo = useCallback(() => {
    const { history, selectedId } = sceneDocumentStore.getState()
    const undoResult = undoSceneHistory({ history, selectedId, isDragging })

    if (!undoResult.didChange) {
      return false
    }

    sceneDocumentActions.setHistory(undoResult.history)
    sceneDocumentActions.setSelectedId(undoResult.selectedId)

    return true
  }, [isDragging])

  const redo = useCallback(() => {
    const { history, selectedId } = sceneDocumentStore.getState()
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
