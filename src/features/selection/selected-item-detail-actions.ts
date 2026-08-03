import { msg } from '@lingui/core/macro'
import { resolvePositionFromWallClearances } from '@/domain/geometry/wall-clearance'
import { i18n } from '@/shared/i18n/i18n'
import { feedback } from '@/core/stores/feedback-store'
import { getCurrentRoomLayoutBounds } from '@/core/operations/room-size'
import { getSelectedFurniture } from '@/core/operations/selected-furniture'
import { sceneCommands } from '@/core/scene-commands'
import { setSelectionTransform } from '@/core/operations/furniture-mutations'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from './selected-item.types'
import { formatSelectedItemDetailsBlockedMessage } from './selected-item-detail-messages'

// The inspector shows clockwise degrees (floorplan convention); the model
// stores rotationY as three's counterclockwise radians. formatDegrees in
// selected-details-view inverts back for display.
function clockwiseDegreesToRotationY(valueDegrees: number) {
  const normalizedDegrees = ((valueDegrees % 360) + 360) % 360
  const counterclockwiseDegrees = (360 - normalizedDegrees) % 360
  return (counterclockwiseDegrees * Math.PI) / 180
}

export function updateSelectedItemDetails(
  input: UpdateSelectedItemDetailsInput,
): UpdateSelectedItemDetailsResult {
  const selectedFurniture = getSelectedFurniture()

  if (!selectedFurniture || !sceneCommands.isSceneReady()) {
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
      ? resolvePositionFromWallClearances(
          selectedFurniture,
          { left: input.value },
          getCurrentRoomLayoutBounds(),
        )
      : input.field === 'positionZ'
        ? resolvePositionFromWallClearances(
            selectedFurniture,
            { back: input.value },
            getCurrentRoomLayoutBounds(),
          )
        : undefined
  const nextRotationY =
    input.field === 'rotationDegrees'
      ? clockwiseDegreesToRotationY(input.value)
      : undefined

  const result = setSelectionTransform({
    position: nextPosition,
    rotationY: nextRotationY,
  })

  if (result.ok) {
    const itemName = result.item.name
    feedback.interactionUpdate(i18n._(msg`${itemName} details updated.`))
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
}
