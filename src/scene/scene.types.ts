import type { FurnitureItem } from '@/domain/furniture'
export type { CameraPreset } from '@/scene/internal/camera/camera-presets'

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

export type UpdateSelectionTransformResult =
  | { ok: true; item: FurnitureItem }
  | {
      ok: false
      reason:
        | 'no-selection'
        | 'dragging'
        | 'blocked-collision'
        | 'blocked-bounds'
        | 'no-op'
    }

export type AddFurnitureResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'unknown-catalog' | 'no-space' }

export type SelectByIdResult =
  | { ok: true; status: 'selected' | 'cleared' }
  | { ok: false; status: 'not-found' | 'blocked-dragging' }

export type CameraKeyName =
  | 'arrowUp'
  | 'arrowDown'
  | 'arrowLeft'
  | 'arrowRight'
  | 'keyW'
  | 'keyA'
  | 'keyS'
  | 'keyD'
  | 'shift'
  | 'equal'
  | 'minus'

export type CameraKeyState = Set<CameraKeyName>

export interface ScreenPoint {
  x: number
  y: number
}

type SelectedToolbarGeometrySource =
  | 'ui-bounds-node'
  | 'render-bounds'
  | 'object-origin'

type SelectedToolbarGeometryUnavailableReason =
  | 'no-selection'
  | 'object-not-ready'
  | 'no-placement-points'
  | 'non-finite-projection'
  | 'behind-camera'

export type SelectedToolbarGeometry =
  | {
      kind: 'available'
      selectedId: string
      source: SelectedToolbarGeometrySource
      sourceNodeName?: string
      canvasSize: { width: number; height: number }
      sourcePointCount: number
      projectedPointCount: number
      points: ScreenPoint[]
    }
  | {
      kind: 'unavailable'
      selectedId: string | null
      reason: SelectedToolbarGeometryUnavailableReason
    }
