import type { FurnitureItem } from '@/domain/furniture'

export type SelectedItemDetailField =
  | 'positionX'
  | 'positionZ'
  | 'rotationDegrees'

export interface UpdateSelectedItemDetailsInput {
  field: SelectedItemDetailField
  fieldLabel: string
  value: number
}

export type UpdateSelectedItemDetailsResult =
  | {
      ok: true
      item: FurnitureItem
    }
  | {
      ok: false
      reason: 'no-op'
    }
  | {
      ok: false
      reason:
        | 'no-selection'
        | 'dragging'
        | 'blocked-collision'
        | 'blocked-bounds'
      message: string
    }
