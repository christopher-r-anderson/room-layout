import { feedbackActions } from '@/core/stores/feedback-store'
import { isEditorInteractive } from '@/core/stores/editor-lifecycle-store'
import {
  sceneDocumentActions,
  sceneDocumentStore,
  selectSelectedFurniture,
} from '@/core/stores/scene-document-store'
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
    isEditorInteractive()
  const movedItemName =
    selectSelectedFurniture(sceneDocumentStore.getState())?.name ?? null
  sceneDocumentActions.clearEditorMessage()

  const result =
    editorInteractionsEnabled && sceneCommands.isSceneReady()
      ? sceneCommands.moveSelection(delta, {
          source: options?.source ?? 'keyboard',
        })
      : ({ ok: false, reason: 'no-selection' } as const)

  if (result.ok) {
    if (movedItemName) {
      feedbackActions.queueMovementAnnouncement(
        `${movedItemName} moved to X ${formatCoordinate(result.position[0])} and Z ${formatCoordinate(result.position[2])}.`,
      )
    }

    return result
  }

  const blockedMessage = formatMoveBlockedMessage(result.reason)

  if (blockedMessage) {
    feedbackActions.queueMovementAnnouncement(blockedMessage)
  }

  return result
}

export function rotateSelection(direction: -1 | 1) {
  const editorInteractionsEnabled =
    isEditorInteractive()
  const rotatingName =
    selectSelectedFurniture(sceneDocumentStore.getState())?.name ?? null
  sceneDocumentActions.clearEditorMessage()

  if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
    return
  }

  sceneCommands.rotateSelection(direction * ROTATION_STEP_RADIANS)

  if (rotatingName) {
    feedbackActions.announcePolite(`${rotatingName} rotated.`)
  }
}
