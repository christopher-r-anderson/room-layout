import { useCallback, type RefObject } from 'react'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
  DELETE_SELECTION_MISSING_MESSAGE,
} from './editor-command-messages'
import type {
  MoveSource,
  MoveSelectionResult,
  SceneReadModel,
  SceneRef,
  SelectByIdResult,
} from '@/scene/scene.types'

interface UseEditorSceneCommandsOptions {
  catalogIdToAdd: string
  clearEditorMessage: () => void
  editorInteractionsEnabled: boolean
  rotationStepRadians: number
  sceneRef: RefObject<SceneRef | null>
  setEditorMessage: (message: string | null) => void
}

interface EditorSceneCommands {
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

export function useEditorSceneCommands({
  catalogIdToAdd,
  clearEditorMessage,
  editorInteractionsEnabled,
  rotationStepRadians,
  sceneRef,
  setEditorMessage,
}: UseEditorSceneCommandsOptions): EditorSceneCommands {
  const rotateSelection = useCallback(
    (direction: -1 | 1) => {
      if (!editorInteractionsEnabled) {
        return
      }

      sceneRef.current?.rotateSelection(direction * rotationStepRadians)
    },
    [editorInteractionsEnabled, rotationStepRadians, sceneRef],
  )

  const undo = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.undo()
  }, [editorInteractionsEnabled, sceneRef])

  const redo = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.redo()
  }, [editorInteractionsEnabled, sceneRef])

  const clearSelection = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    sceneRef.current?.clearSelection()
  }, [editorInteractionsEnabled, sceneRef])

  const moveSelection = useCallback(
    (
      delta: { x: number; z: number },
      options?: { source?: MoveSource },
    ): MoveSelectionResult => {
      if (!editorInteractionsEnabled) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      const scene = sceneRef.current

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
    [editorInteractionsEnabled, sceneRef],
  )

  const selectById = useCallback(
    (id: string | null): SelectByIdResult => {
      if (!editorInteractionsEnabled) {
        return {
          ok: false,
          status: 'not-found',
        }
      }

      const scene = sceneRef.current

      if (!scene) {
        return {
          ok: false,
          status: 'not-found',
        }
      }

      return scene.selectById(id)
    },
    [editorInteractionsEnabled, sceneRef],
  )

  const getSceneReadModel = useCallback((): SceneReadModel | null => {
    if (!editorInteractionsEnabled) {
      return null
    }

    return sceneRef.current?.getReadModel() ?? null
  }, [editorInteractionsEnabled, sceneRef])

  const addFurniture = useCallback(() => {
    if (!editorInteractionsEnabled || !catalogIdToAdd) {
      return false
    }

    const scene = sceneRef.current

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
  }, [
    catalogIdToAdd,
    clearEditorMessage,
    editorInteractionsEnabled,
    sceneRef,
    setEditorMessage,
  ])

  const confirmDeleteSelection = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return false
    }

    const scene = sceneRef.current

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
  }, [
    clearEditorMessage,
    editorInteractionsEnabled,
    sceneRef,
    setEditorMessage,
  ])

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
