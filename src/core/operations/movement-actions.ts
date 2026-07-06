import { msg } from '@lingui/core/macro'
import { feedbackActions } from '@/core/stores/feedback-store'
import { getSelectedFurniture } from '@/core/operations/selected-furniture'
import { toolbarInteractionActions } from '@/core/stores/toolbar-interaction-store'
import { sceneCommands } from '@/core/scene-commands'
import {
  moveSelection as moveDocumentSelection,
  rotateSelection as rotateDocumentSelection,
} from './furniture-mutations'
import type { MoveSelectionResult, MoveSource } from '@/core/scene.types'
import { i18n } from '@/shared/i18n/i18n'
import { formatDistanceMeters } from '@/shared/i18n/formatters'

const ROTATION_STEP_RADIANS = Math.PI / 12

function formatMoveBlockedMessage(
  reason: Exclude<MoveSelectionResult, { ok: true }>['reason'],
) {
  switch (reason) {
    case 'blocked-bounds':
      return i18n._(msg`Movement blocked by room bounds.`)
    case 'blocked-collision':
      return i18n._(msg`Movement blocked by another furniture item.`)
    case 'dragging':
      return i18n._(msg`Finish dragging before using movement controls.`)
    case 'no-selection':
      return i18n._(msg`Select a furniture item first.`)
    case 'no-op':
      return ''
  }
}

export function moveSelection(
  delta: { x: number; z: number },
  options?: { source?: MoveSource },
): MoveSelectionResult {
  const movedItemName = getSelectedFurniture()?.name ?? null
  feedbackActions.clearStatusMessage()

  const result = sceneCommands.isSceneReady()
    ? moveDocumentSelection(delta, {
        source: options?.source ?? 'keyboard',
      })
    : ({ ok: false, reason: 'no-selection' } as const)

  if (result.ok) {
    if (movedItemName) {
      const x = formatDistanceMeters(result.position[0])
      const z = formatDistanceMeters(result.position[2])
      feedbackActions.queueMovementAnnouncement(
        i18n._(msg`${movedItemName} moved to X ${x} and Z ${z}.`),
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
  const rotatingFurniture = getSelectedFurniture()
  const rotatingName = rotatingFurniture?.name ?? null
  feedbackActions.clearStatusMessage()

  if (!sceneCommands.isSceneReady()) {
    return
  }

  // Pin the toolbar's position briefly after every rotation (whichever input
  // triggered it) so repeated rotate presses don't walk it out from under the
  // cursor as the object re-projects — but only when something is selected, so a
  // no-op rotate can't arm the grace and pin the next toolbar that appears.
  if (rotatingFurniture !== null) {
    toolbarInteractionActions.reportRotation()
  }

  rotateDocumentSelection(direction * ROTATION_STEP_RADIANS)

  if (rotatingName) {
    feedbackActions.announcePolite(i18n._(msg`${rotatingName} rotated.`))
  }
}
