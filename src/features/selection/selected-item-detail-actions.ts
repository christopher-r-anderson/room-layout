import { msg } from '@lingui/core/macro'
import { resolvePositionFromWallClearances } from '@/domain/geometry/wall-clearance'
import { i18n } from '@/shared/i18n/i18n'
import { feedbackActions } from '@/core/stores/feedback-store'
import { getSelectedFurniture } from '@/core/operations/selected-furniture'
import { selectionActions } from '@/core/stores/selection-store'
import { sceneCommands } from '@/core/scene-commands'
import { setSelectionTransform } from '@/core/operations/furniture-mutations'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from './selected-item.types'
import { formatSelectedItemDetailsBlockedMessage } from './selected-item-detail-messages'

function normalizeDegreesRadians(valueDegrees: number) {
  const normalizedDegrees = ((valueDegrees % 360) + 360) % 360
  const counterclockwiseDegrees = (360 - normalizedDegrees) % 360
  return (counterclockwiseDegrees * Math.PI) / 180
}

export function updateSelectedItemDetails(
  input: UpdateSelectedItemDetailsInput,
): UpdateSelectedItemDetailsResult {
  feedbackActions.clearStatusMessage()

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

  const result = setSelectionTransform({
    position: nextPosition,
    rotationY: nextRotationY,
  })

  if (result.ok) {
    selectionActions.setSelection(result.item.id, 'panel-keyboard')
    const itemName = result.item.name
    feedbackActions.announcePolite(i18n._(msg`${itemName} details updated.`))
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
