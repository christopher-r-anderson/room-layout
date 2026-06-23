import { resolvePositionFromWallClearances } from '@/shared/lib/three/wall-clearance'
import { announcementActions } from '@/core/stores/announcement-store'
import {
  sceneStateActions,
  sceneStateStore,
  selectSelectedFurniture,
} from '@/core/stores/scene-state-store'
import { editorRuntimeStore } from '@/core/stores/editor-runtime-store'
import { selectionMetaActions } from '@/core/stores/selection-meta-store'
import { sceneCommands } from '@/scene/scene-commands'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/core/types/selected-item.types'
import {
  formatSelectedItemDetailsBlockedMessage,
  formatSelectedItemDetailsInvalidValueMessage,
} from '@/shared/messages/selected-item-detail-messages'

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
  sceneStateActions.clearEditorMessage()

  const selectedFurniture = selectSelectedFurniture(sceneStateStore.getState())
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'

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
    announcementActions.announcePolite(`${result.item.name} details updated.`)
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
