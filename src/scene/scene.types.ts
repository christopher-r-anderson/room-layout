import type { SceneSnapshot } from './scene-snapshot'

export interface SceneRef {
  clearSelection: () => void
  rotateSelection: (deltaRadians: number) => void
  addFurniture: (
    catalogId: string,
  ) =>
    | { ok: true; id: string }
    | { ok: false; reason: 'unknown-catalog' | 'no-space' }
  removeSelection: () => boolean
  undo: () => boolean
  redo: () => boolean
  getSnapshot: () => SceneSnapshot
}
