import { useCallback, type RefObject } from 'react'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
  DELETE_SELECTION_MISSING_MESSAGE,
} from './editor-command-messages'
import type { SceneRef } from '@/scene/scene.types'

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
  confirmDeleteSelection: () => void
  redo: () => void
  rotateSelection: (direction: -1 | 1) => void
  selectById: (id: string | null) => void
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

  const selectById = useCallback(
    (id: string | null) => {
      if (!editorInteractionsEnabled) {
        return
      }

      sceneRef.current?.selectById(id)
    },
    [editorInteractionsEnabled, sceneRef],
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
      return
    }

    const scene = sceneRef.current

    if (!scene) {
      return
    }

    const deleted = scene.deleteSelection()

    if (!deleted) {
      setEditorMessage(DELETE_SELECTION_MISSING_MESSAGE)
      return
    }

    clearEditorMessage()
  }, [
    clearEditorMessage,
    editorInteractionsEnabled,
    sceneRef,
    setEditorMessage,
  ])

  return {
    addFurniture,
    confirmDeleteSelection,
    redo,
    rotateSelection,
    selectById,
    undo,
  }
}
