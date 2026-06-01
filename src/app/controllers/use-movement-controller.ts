import { useCallback } from 'react'
import { resolvePositionFromWallClearances } from '@/lib/three/wall-clearance'
import {
  sceneStateActions,
  useSelectedFurniture,
} from '@/editor-state/scene-state-store'
import { selectionMetaActions } from '@/editor-state/selection-meta-store'
import { sceneCommands } from '@/scene/scene-commands'
import type { MoveSource, MoveSelectionResult } from '@/scene/scene.types'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/app/selected-item-details.types'
import {
  formatCoordinate,
  formatMoveBlockedMessage,
  formatSelectedItemDetailsBlockedMessage,
  formatSelectedItemDetailsInvalidValueMessage,
  normalizeDegreesRadians,
} from './_shared/format-messages'

interface AnnouncementsApi {
  announcePolite: (message: string) => void
  queueMovementAnnouncement: (message: string) => void
}

interface MovementControllerOptions {
  announcements: AnnouncementsApi
  editorInteractionsEnabled: boolean
  rotationStepRadians: number
}

export function useMovementController({
  announcements,
  editorInteractionsEnabled,
  rotationStepRadians,
}: MovementControllerOptions) {
  const selectedFurniture = useSelectedFurniture()
  const { announcePolite, queueMovementAnnouncement } = announcements

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
          queueMovementAnnouncement(
            `${movedItemName} moved to X ${formatCoordinate(result.position[0])} and Z ${formatCoordinate(result.position[2])}.`,
          )
        }

        return result
      }

      const blockedMessage = formatMoveBlockedMessage(result.reason)

      if (blockedMessage) {
        queueMovementAnnouncement(blockedMessage)
      }

      return result
    },
    [editorInteractionsEnabled, queueMovementAnnouncement, selectedFurniture],
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
        announcePolite(`${rotatingName} rotated.`)
      }
    },
    [
      announcePolite,
      editorInteractionsEnabled,
      rotationStepRadians,
      selectedFurniture,
    ],
  )

  const handleInvalidSelectedItemDetailValue = useCallback(
    (fieldLabel: string) => {
      return formatSelectedItemDetailsInvalidValueMessage(fieldLabel)
    },
    [],
  )

  const handleUpdateSelectedItemDetails = useCallback(
    (
      input: UpdateSelectedItemDetailsInput,
    ): UpdateSelectedItemDetailsResult => {
      sceneStateActions.clearEditorMessage()

      if (
        !selectedFurniture ||
        !editorInteractionsEnabled ||
        !sceneCommands.isSceneReady()
      ) {
        return {
          ok: false,
          reason: 'no-selection',
          message: formatSelectedItemDetailsBlockedMessage(
            input.fieldLabel,
            'no-selection',
          ),
        }
      }

      const nextPosition: [number, number, number] | undefined =
        input.field === 'positionX'
          ? resolvePositionFromWallClearances(selectedFurniture, {
              left: input.value,
            })
          : input.field === 'positionZ'
            ? resolvePositionFromWallClearances(selectedFurniture, {
                back: input.value,
              })
            : undefined
      const nextRotationY =
        input.field === 'rotationDegrees'
          ? normalizeDegreesRadians(input.value)
          : undefined

      const result = sceneCommands.setSelectionTransform({
        position: nextPosition,
        rotationY: nextRotationY,
      })

      if (result.ok) {
        selectionMetaActions.setSelectedSource('panel-keyboard')
        announcePolite(`${result.item.name} details updated.`)
        return { ok: true, item: result.item }
      }

      if (result.reason === 'no-op') {
        return {
          ok: false,
          reason: 'no-op',
        }
      }

      return {
        ok: false,
        reason: result.reason,
        message: formatSelectedItemDetailsBlockedMessage(
          input.fieldLabel,
          result.reason,
        ),
      }
    },
    [announcePolite, editorInteractionsEnabled, selectedFurniture],
  )

  return {
    handleMoveSelection,
    handleRotateSelection,
    handleInvalidSelectedItemDetailValue,
    handleUpdateSelectedItemDetails,
  }
}
