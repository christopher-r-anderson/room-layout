import type { FurnitureItem } from '@/scene/objects/furniture.types'

export const DIALOG_IDS = {
  catalog: 'catalog',
  delete: 'delete',
  roomSurface: 'room-surface',
  keyboardShortcuts: 'keyboard-shortcuts',
  projectInfo: 'project-info',
  headerMoreActions: 'header-more-actions',
  startOver: 'start-over',
} as const

export type DialogId = (typeof DIALOG_IDS)[keyof typeof DIALOG_IDS]

export type DialogKind = 'blocking' | 'non-blocking'

export type DialogAccessPoint =
  | 'top-header-room'
  | 'top-header-keyboard-shortcuts'
  | 'top-header-project-info'
  | 'top-header-start-over'
  | 'top-header-more-actions'
  | 'room-view'
  | 'outliner'
  | 'selection-inspector'
  | 'none'

export interface DialogOpenRequest<TPayload = unknown> {
  payload?: TPayload
  returnFocusAccessPoint?: DialogAccessPoint
}

export interface DialogRuntimeContext {
  isDialogsEnabled: () => boolean
  getSelectedFurniture: () => FurnitureItem | null
  canStartOver: () => boolean
}

export interface DialogDefinition<TPayload = unknown> {
  id: DialogId
  kind: DialogKind
  getPayload?: (
    context: DialogRuntimeContext,
    request?: DialogOpenRequest,
  ) => TPayload | null
  canOpen?: (
    context: DialogRuntimeContext,
    request?: DialogOpenRequest,
  ) => boolean
  getReturnFocusAccessPoint?: (
    context: DialogRuntimeContext,
    request?: DialogOpenRequest,
  ) => DialogAccessPoint
}

export interface ActiveSurfaceState<TPayload = unknown> {
  id: DialogId
  kind: DialogKind
  payload: TPayload | null
  returnFocusAccessPoint: DialogAccessPoint
}
