import { sceneStateActions } from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
  DELETE_SELECTION_MISSING_MESSAGE,
} from './hooks/command-messages'
import type {
  AddFurnitureResult,
  CameraPreset,
  MoveSource,
  MoveSelectionResult,
  SelectByIdResult,
  UpdateSelectionTransformResult,
} from '@/scene/scene.types'

interface CreateSceneCommandActionsOptions {
  catalogIdToAdd: string
  editorInteractionsEnabled: boolean
  rotationStepRadians: number
}

export interface SceneCommandActions {
  addFurniture: () => boolean
  clearSelection: () => void
  confirmDeleteSelection: () => boolean
  focusSelected: () => void
  moveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  setSelectionTransform: (input: {
    position?: [number, number, number]
    rotationY?: number
  }) => UpdateSelectionTransformResult
  redo: () => boolean
  rotateSelection: (direction: -1 | 1) => void
  selectById: (id: string | null) => SelectByIdResult
  setCameraPreset: (preset: CameraPreset) => void
  undo: () => boolean
}

export function createSceneCommandActions({
  catalogIdToAdd,
  editorInteractionsEnabled,
  rotationStepRadians,
}: CreateSceneCommandActionsOptions): SceneCommandActions {
  const isEnabledSceneReady = () => {
    return editorInteractionsEnabled && sceneCommands.isSceneReady()
  }

  return {
    addFurniture: () => {
      if (!catalogIdToAdd || !isEnabledSceneReady()) {
        return false
      }

      const result: AddFurnitureResult =
        sceneCommands.addFurniture(catalogIdToAdd)

      if (!result.ok) {
        sceneStateActions.setEditorMessage(
          result.reason === 'no-space'
            ? ADD_FURNITURE_NO_SPACE_MESSAGE
            : ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
        )
        return false
      }

      sceneStateActions.clearEditorMessage()
      return true
    },
    clearSelection: () => {
      if (!isEnabledSceneReady()) {
        return
      }

      sceneCommands.clearSelection()
    },
    confirmDeleteSelection: () => {
      if (!isEnabledSceneReady()) {
        return false
      }

      const deleted = sceneCommands.deleteSelection()

      if (!deleted) {
        sceneStateActions.setEditorMessage(DELETE_SELECTION_MISSING_MESSAGE)
        return false
      }

      sceneStateActions.clearEditorMessage()
      return true
    },
    focusSelected: () => {
      if (!isEnabledSceneReady()) {
        return
      }

      sceneCommands.focusSelected()
    },
    moveSelection: (
      delta: { x: number; z: number },
      options?: { source?: MoveSource },
    ): MoveSelectionResult => {
      if (!isEnabledSceneReady()) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      return sceneCommands.moveSelection(delta, {
        source: options?.source ?? 'keyboard',
      })
    },
    setSelectionTransform: (input: {
      position?: [number, number, number]
      rotationY?: number
    }): UpdateSelectionTransformResult => {
      if (!isEnabledSceneReady()) {
        return {
          ok: false,
          reason: 'no-selection',
        }
      }

      return sceneCommands.setSelectionTransform(input)
    },
    redo: () => {
      if (!isEnabledSceneReady()) {
        return false
      }

      return sceneCommands.redo()
    },
    rotateSelection: (direction: -1 | 1) => {
      if (!isEnabledSceneReady()) {
        return
      }

      sceneCommands.rotateSelection(direction * rotationStepRadians)
    },
    selectById: (id: string | null): SelectByIdResult => {
      if (!isEnabledSceneReady()) {
        return {
          ok: false,
          status: 'not-found',
        }
      }

      return sceneCommands.selectById(id)
    },
    setCameraPreset: (preset: CameraPreset) => {
      if (!isEnabledSceneReady()) {
        return
      }

      sceneCommands.setCameraPreset(preset)
    },
    undo: () => {
      if (!isEnabledSceneReady()) {
        return false
      }

      return sceneCommands.undo()
    },
  }
}
