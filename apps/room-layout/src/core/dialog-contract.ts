import type { FurnitureItem } from '@/domain/furniture'

export type DialogId = string

export type DialogKind = 'blocking' | 'non-blocking'

export interface DialogRuntimeContext {
  isDialogsEnabled: () => boolean
  getSelectedFurniture: () => FurnitureItem | null
  canStartOver: () => boolean
}

export interface DialogDefinition<TPayload = unknown> {
  id: DialogId
  kind: DialogKind
  getPayload?: (context: DialogRuntimeContext) => TPayload | null
  canOpen?: (context: DialogRuntimeContext) => boolean
}
