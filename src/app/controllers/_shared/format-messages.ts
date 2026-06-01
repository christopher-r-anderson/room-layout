import type {
  MoveSelectionResult,
  UpdateSelectionTransformResult,
} from '@/scene/scene.types'

export function formatCoordinate(value: number) {
  return `${value.toFixed(1)} meters`
}

export function normalizeDegreesRadians(valueDegrees: number) {
  const normalizedDegrees = ((valueDegrees % 360) + 360) % 360
  const counterclockwiseDegrees = (360 - normalizedDegrees) % 360
  return (counterclockwiseDegrees * Math.PI) / 180
}

export function formatMoveBlockedMessage(
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

export function formatSelectedItemDetailsBlockedMessage(
  fieldLabel: string,
  reason: Exclude<UpdateSelectionTransformResult, { ok: true }>['reason'],
) {
  switch (reason) {
    case 'blocked-bounds':
      return `${fieldLabel} must stay inside the room.`
    case 'blocked-collision':
      return `${fieldLabel} overlaps another item.`
    case 'dragging':
      return 'Finish dragging before editing item details.'
    case 'no-selection':
      return 'Select a furniture item first.'
    case 'no-op':
      return ''
  }
}

export function formatSelectedItemDetailsInvalidValueMessage(
  fieldLabel: string,
) {
  return `${fieldLabel} must be a valid number.`
}
