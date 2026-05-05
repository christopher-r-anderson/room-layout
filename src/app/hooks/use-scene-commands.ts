import { useCallback, type RefObject } from 'react'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
  DELETE_SELECTION_MISSING_MESSAGE,
} from './command-messages'
import type {
  MoveSource,
  MoveSelectionResult,
  SceneReadModel,
  SceneRef,
  SelectByIdResult,
} from '@/scene/scene.types'

interface UseSceneCommandsOptions {
  catalogIdToAdd: string
  clearEditorMessage: () => void
  editorInteractionsEnabled: boolean
  rotationStepRadians: number
  sceneRef: RefObject<SceneRef | null>
  setEditorMessage: (message: string | null) => void
}

interface SceneCommands {
  addFurniture: () => boolean
  clearSelection: () => void
  confirmDeleteSelection: () => boolean
  getSceneReadModel: () => SceneReadModel | null
  moveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  redo: () => void
  rotateSelection: (direction: -1 | 1) => void
  selectById: (id: string | null) => SelectByIdResult
  undo: () => void
}

export function useSceneCommands({
  catalogIdToAdd,
  clearEditorMessage,
  editorInteractionsEnabled,
  rotationStepRadians,
  sceneRef,
  setEditorMessage,
}: UseSceneCommandsOptions): SceneCommands {
  const getScene = useCallback(() => {
    return sceneRef.current
  }, [sceneRef])

  const getEnabledScene = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return null
    }

    return getScene()
  }, [editorInteractionsEnabled, getScene])

  const rotateSelection = useCallback(
    (direction: -1 | 1) => {
      getEnabledScene()?.rotateSelection(direction * rotationStepRadians)
    },
    [getEnabledScene, rotationStepRadians],
  )

  const undo = useCallback(() => {
    getEnabledScene()?.undo()
  }, [getEnabledScene])

  const redo = useCallback(() => {
    getEnabledScene()?.redo()
  }, [getEnabledScene])

  const clearSelection = useCallback(() => {
    getEnabledScene()?.clearSelection()
  }, [getEnabledScene])

  const moveSelection = useCallback(
    (
      delta: { x: number; z: number },
      options?: { source?: MoveSource },
    ): MoveSelectionResult => {
      const scene = getEnabledScene()

      if (!scene) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      return scene.moveSelection(delta, {
        source: options?.source ?? 'keyboard',
      })
    },
    [getEnabledScene],
  )

  const selectById = useCallback(
    (id: string | null): SelectByIdResult => {
      const scene = getEnabledScene()

      if (!scene) {
        return {
          ok: false,
          status: 'not-found',
        }
      }

      return scene.selectById(id)
    },
    [getEnabledScene],
  )

  const getSceneReadModel = useCallback((): SceneReadModel | null => {
    return getEnabledScene()?.getReadModel() ?? null
  }, [getEnabledScene])

  const addFurniture = useCallback(() => {
    if (!catalogIdToAdd) {
      return false
    }

    const scene = getEnabledScene()

    if (!scene) {
      return false
    }

    const result = scene.addFurniture(catalogIdToAdd)

    if (!result.ok) {
      setEditorMessage(
        result.reason === 'no-space'
          ? ADD_FURNITURE_NO_SPACE_MESSAGE
          : ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
      )
      return false
    }

    clearEditorMessage()
    return true
  }, [catalogIdToAdd, clearEditorMessage, getEnabledScene, setEditorMessage])

  const confirmDeleteSelection = useCallback(() => {
    const scene = getEnabledScene()

    if (!scene) {
      return false
    }

    const deleted = scene.deleteSelection()

    if (!deleted) {
      setEditorMessage(DELETE_SELECTION_MISSING_MESSAGE)
      return false
    }

    clearEditorMessage()
    return true
  }, [clearEditorMessage, getEnabledScene, setEditorMessage])

  return {
    addFurniture,
    clearSelection,
    confirmDeleteSelection,
    getSceneReadModel,
    moveSelection,
    redo,
    rotateSelection,
    selectById,
    undo,
  }
}
