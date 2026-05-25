import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { UpdateSelectionTransformResult } from '@/scene/scene.types'

type UpdateSelectedItemDetailsFailureReason = Exclude<
  UpdateSelectionTransformResult,
  { ok: true }
>['reason']

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
      reason: Exclude<UpdateSelectedItemDetailsFailureReason, 'no-op'>
      message: string
    }
