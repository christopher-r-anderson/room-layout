import type { SceneSnapshot } from './scene-snapshot'
import type { FurnitureItem } from './objects/furniture.types'

export type MoveSource = 'keyboard' | 'inspector' | 'toolbar' | 'drag'

export type MoveSelectionResult =
  | { ok: true; position: [number, number, number] }
  | {
      ok: false
      reason:
        | 'no-selection'
        | 'dragging'
        | 'blocked-collision'
        | 'blocked-bounds'
        | 'no-op'
    }

export type SelectByIdResult =
  | { ok: true; status: 'selected' | 'cleared' }
  | { ok: false; status: 'not-found' | 'blocked-dragging' }

export interface SceneReadModel {
  selectedId: string | null
  items: FurnitureItem[]
}

export interface SceneRef {
  clearSelection: () => void
  selectById: (id: string | null) => SelectByIdResult
  moveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  rotateSelection: (deltaRadians: number) => void
  addFurniture: (
    catalogId: string,
  ) =>
    | { ok: true; id: string }
    | { ok: false; reason: 'unknown-catalog' | 'no-space' }
  deleteSelection: () => boolean
  undo: () => boolean
  redo: () => boolean
  getSnapshot: () => SceneSnapshot
  getReadModel: () => SceneReadModel
}
