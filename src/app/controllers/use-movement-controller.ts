import { useCallback } from 'react'
import { announcementActions } from '@/editor-state/announcement-store'
import {
  sceneStateActions,
  useSelectedFurniture,
} from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import type { MoveSource, MoveSelectionResult } from '@/scene/scene.types'
import {
  formatCoordinate,
  formatMoveBlockedMessage,
} from './_shared/format-messages'

interface MovementControllerOptions {
  editorInteractionsEnabled: boolean
  rotationStepRadians: number
}

export function useMovementController({
  editorInteractionsEnabled,
  rotationStepRadians,
}: MovementControllerOptions) {
  const selectedFurniture = useSelectedFurniture()

  const handleMoveSelection = useCallback(
    (
      delta: { x: number; z: number },
      options?: { source?: MoveSource },
    ): MoveSelectionResult => {
      const movedItemName = selectedFurniture?.name ?? null
      sceneStateActions.clearEditorMessage()

      const result =
        editorInteractionsEnabled && sceneCommands.isSceneReady()
          ? sceneCommands.moveSelection(delta, {
              source: options?.source ?? 'keyboard',
            })
          : ({ ok: false, reason: 'no-selection' } as const)

      if (result.ok) {
        if (movedItemName) {
          announcementActions.queueMovementAnnouncement(
            `${movedItemName} moved to X ${formatCoordinate(result.position[0])} and Z ${formatCoordinate(result.position[2])}.`,
          )
        }

        return result
      }

      const blockedMessage = formatMoveBlockedMessage(result.reason)

      if (blockedMessage) {
        announcementActions.queueMovementAnnouncement(blockedMessage)
      }

      return result
    },
    [editorInteractionsEnabled, selectedFurniture],
  )

  const handleRotateSelection = useCallback(
    (direction: -1 | 1) => {
      const rotatingName = selectedFurniture?.name ?? null
      sceneStateActions.clearEditorMessage()

      if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
        return
      }

      sceneCommands.rotateSelection(direction * rotationStepRadians)

      if (rotatingName) {
        announcementActions.announcePolite(`${rotatingName} rotated.`)
      }
    },
    [editorInteractionsEnabled, rotationStepRadians, selectedFurniture],
  )

  return {
    handleMoveSelection,
    handleRotateSelection,
  }
}
