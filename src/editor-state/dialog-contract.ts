import type { FurnitureItem } from '@/scene/objects/furniture.types'

export type DialogId = string
export type DialogReturnFocusToken = string

export type DialogKind = 'blocking' | 'non-blocking'

export interface DialogOpenRequest<TPayload = unknown> {
  payload?: TPayload
  returnFocusAccessPoint?: DialogReturnFocusToken
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
  ) => DialogReturnFocusToken
}

export interface ActiveSurfaceState<TPayload = unknown> {
  id: DialogId
  kind: DialogKind
  payload: TPayload | null
  returnFocusAccessPoint: DialogReturnFocusToken
}
