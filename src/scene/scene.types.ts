import type { SceneSnapshot } from './scene-snapshot'

export type MoveSource = 'drag' | 'keyboard' | 'inspector' | 'api'
export type MoveCommitMode = 'immediate' | 'defer'

export type SelectByIdResult =
  | { ok: true; id: string | null }
  | { ok: false; reason: 'invalid-id' }

export type MoveSelectionResult =
  | {
      ok: true
      id: string
      position: [number, number, number]
    }
  | {
      ok: false
      reason: 'none-selected' | 'invalid-selection' | 'blocked'
    }

export interface SceneRef {
  clearSelection: () => void
  selectById: (id: string | null) => SelectByIdResult
  moveSelection: (
    delta: { x: number; z: number },
    options?: {
      source?: MoveSource
      commit?: MoveCommitMode
    },
  ) => MoveSelectionResult
  setSelectionPosition: (
    position: { x: number; z: number },
    options?: {
      source?: MoveSource
      commit?: MoveCommitMode
    },
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
}
