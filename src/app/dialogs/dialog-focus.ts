import type { DialogReturnFocusToken } from '@/editor-state/dialog-contract'

export const DIALOG_ACCESS_POINTS = {
  topHeaderRoom: 'top-header-room',
  topHeaderKeyboardShortcuts: 'top-header-keyboard-shortcuts',
  topHeaderProjectInfo: 'top-header-project-info',
  topHeaderStartOver: 'top-header-start-over',
  topHeaderMoreActions: 'top-header-more-actions',
  roomView: 'room-view',
  outliner: 'outliner',
  selectionInspector: 'selection-inspector',
  none: 'none',
} as const

export type DialogAccessPoint =
  (typeof DIALOG_ACCESS_POINTS)[keyof typeof DIALOG_ACCESS_POINTS]

export interface AppDialogOpenRequest<TPayload = unknown> {
  payload?: TPayload
  returnFocusAccessPoint?: DialogAccessPoint
}

const dialogAccessPoints = new Set<DialogAccessPoint>(
  Object.values(DIALOG_ACCESS_POINTS),
)

export function isDialogAccessPoint(
  value: DialogReturnFocusToken,
): value is DialogAccessPoint {
  return dialogAccessPoints.has(value as DialogAccessPoint)
}
