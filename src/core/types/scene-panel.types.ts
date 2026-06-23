import type { FurnitureItem } from '@/domain/furniture'

export interface SceneOutlinerFocusRequest {
  token: number
  preferredIndex?: number
  targetSelectedId?: string | null
  focusContainer?: boolean
}

export interface ScenePanelReadModel {
  selectedId: string | null
  items: FurnitureItem[]
}
