import { announcementActions } from '@/editor-state/announcement-store'
import { editorRuntimeStore } from '@/editor-state/editor-runtime-store'
import {
  sceneStateActions,
  sceneStateStore,
  selectSelectedFurniture,
} from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import type { MoveSelectionResult, MoveSource } from '@/scene/scene.types'

const ROTATION_STEP_RADIANS = Math.PI / 12

function formatCoordinate(value: number) {
  return `${value.toFixed(1)} meters`
}

function formatMoveBlockedMessage(
  reason: Exclude<MoveSelectionResult, { ok: true }>['reason'],
) {
  switch (reason) {
    case 'blocked-bounds':
      return 'Movement blocked by room bounds.'
    case 'blocked-collision':
      return 'Movement blocked by another furniture item.'
    case 'dragging':
      return 'Finish dragging before using movement controls.'
    case 'no-selection':
      return 'Select a furniture item first.'
    case 'no-op':
      return ''
  }
}

export function moveSelection(
  delta: { x: number; z: number },
  options?: { source?: MoveSource },
): MoveSelectionResult {
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'
  const movedItemName =
    selectSelectedFurniture(sceneStateStore.getState())?.name ?? null
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
}

export function rotateSelection(direction: -1 | 1) {
  const editorInteractionsEnabled =
    editorRuntimeStore.getState().startupPhase === 'ready'
  const rotatingName =
    selectSelectedFurniture(sceneStateStore.getState())?.name ?? null
  sceneStateActions.clearEditorMessage()

  if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
    return
  }

  sceneCommands.rotateSelection(direction * ROTATION_STEP_RADIANS)

  if (rotatingName) {
    announcementActions.announcePolite(`${rotatingName} rotated.`)
  }
}
