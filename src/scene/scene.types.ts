import type { SceneSnapshot } from './internal/scene-snapshot'
import type {
  FurnitureInstance,
  FurnitureItem,
} from './objects/furniture.types'
import type { CameraPreset } from '@/lib/three/camera-presets'
export type { CameraPreset } from '@/lib/three/camera-presets'

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
  setCameraPreset: (preset: CameraPreset) => void
  focusSelected: () => void
  /**
   * Seeds the scene with the given furniture instances as the initial baseline,
   * clearing selection and establishing an empty undo/redo stack. The instance-id
   * counter is advanced past the highest restored suffix so future adds are unique.
   * Intended for URL restore on startup only — not for interactive editing.
   */
  restoreInitialLayout: (instances: FurnitureInstance[]) => void
}
