import { msg } from '@lingui/core/macro'
import { resolvePositionFromWallClearances } from '@/domain/geometry/wall-clearance'
import { i18n } from '@/shared/i18n/i18n'
import { feedback } from '@/core/stores/feedback-store'
import { getSelectedFurniture } from '@/core/operations/selected-furniture'
import { applySelection } from '@/core/operations/selection-mutations'
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
    // Same-id in practice (the transform applied to the current selection);
    // routed through applySelection so the provenance refresh cannot bypass
    // the one-write-path invariant.
    applySelection(result.item.id, 'panel-keyboard')
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
