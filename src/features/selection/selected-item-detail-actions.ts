import { msg } from '@lingui/core/macro'
import { resolvePositionFromWallClearances } from '@/domain/geometry/wall-clearance'
import { i18n } from '@/shared/i18n/i18n'
import { feedbackActions } from '@/core/stores/feedback-store'
import {
  sceneDocumentStore,
  selectSelectedFurniture,
} from '@/core/stores/scene-document-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'
import { sceneCommands } from '@/scene/scene-commands'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/core/types/selected-item.types'
import {
  formatSelectedItemDetailsBlockedMessage,
  formatSelectedItemDetailsInvalidValueMessage,
} from './selected-item-detail-messages'

function normalizeDegreesRadians(valueDegrees: number) {
  const normalizedDegrees = ((valueDegrees % 360) + 360) % 360
  const counterclockwiseDegrees = (360 - normalizedDegrees) % 360
  return (counterclockwiseDegrees * Math.PI) / 180
}

export function invalidSelectedItemDetailValueMessage(fieldLabel: string) {
  return formatSelectedItemDetailsInvalidValueMessage(fieldLabel)
}

export function updateSelectedItemDetails(
  input: UpdateSelectedItemDetailsInput,
): UpdateSelectedItemDetailsResult {
  feedbackActions.clearStatusMessage()

  const selectedFurniture = selectSelectedFurniture(
    sceneDocumentStore.getState(),
  )

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

  const result = sceneCommands.setSelectionTransform({
    position: nextPosition,
    rotationY: nextRotationY,
  })

  if (result.ok) {
    selectionFocusActions.setSelectedSource('panel-keyboard')
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
