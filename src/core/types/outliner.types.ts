import type { FurnitureItem } from '@/domain/furniture'

export interface OutlinerFocusRequest {
  token: number
  preferredIndex?: number
  targetSelectedId?: string | null
  focusContainer?: boolean
}

export interface OutlinerReadModel {
  selectedId: string | null
  items: FurnitureItem[]
}
