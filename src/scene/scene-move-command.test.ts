import { describe, expect, it } from 'vitest'
import { createHistoryState } from '@/lib/ui/editor-history'
import type { FurnitureItem } from './objects/furniture.types'
import {
  applyMoveSelectionResultToHistory,
  moveSelectionToPosition,
} from './scene-move-command'

function createFurnitureItem(id: string, x: number, z: number): FurnitureItem {
  return {
    id,
    catalogId: 'catalog-chair',
    name: `Chair ${id}`,
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [x, 0, z],
    rotationY: 0,
  }
}

const bounds = { minX: -3, maxX: 3, minZ: -3, maxZ: 3 }

describe('scene-move-command', () => {
  it('returns none-selected when no selection exists', () => {
    const result = moveSelectionToPosition({
      furniture: [createFurnitureItem('item-1', 0, 0)],
      selectedId: null,
      nextPosition: { x: 1, z: 1 },
      bounds,
      edgeSnapThreshold: 0.12,
    })

    expect(result).toEqual({ ok: false, reason: 'none-selected' })
  })

  it('returns invalid-selection when selected id is missing', () => {
    const result = moveSelectionToPosition({
      furniture: [createFurnitureItem('item-1', 0, 0)],
      selectedId: 'missing',
      nextPosition: { x: 1, z: 1 },
      bounds,
      edgeSnapThreshold: 0.12,
    })

    expect(result).toEqual({ ok: false, reason: 'invalid-selection' })
  })

  it('returns blocked when destination collides', () => {
    const result = moveSelectionToPosition({
      furniture: [
        createFurnitureItem('item-1', 0, 0),
        createFurnitureItem('item-2', 1, 0),
      ],
      selectedId: 'item-1',
      nextPosition: { x: 1, z: 0 },
      bounds,
      edgeSnapThreshold: 0,
    })

    expect(result).toEqual({ ok: false, reason: 'blocked' })
  })

  it('moves selected furniture and returns resolved position', () => {
    const result = moveSelectionToPosition({
      furniture: [createFurnitureItem('item-1', 0, 0)],
      selectedId: 'item-1',
      nextPosition: { x: 1.1, z: 0.7 },
      bounds,
      edgeSnapThreshold: 0.12,
    })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.id).toBe('item-1')
    expect(result.position[0]).toBeCloseTo(1.1)
    expect(result.position[2]).toBeCloseTo(0.7)
  })

  it('applies immediate move as committed history', () => {
    const history = createHistoryState([createFurnitureItem('item-1', 0, 0)])
    const nextHistory = applyMoveSelectionResultToHistory({
      history,
      result: { ok: true, id: 'item-1', position: [1, 0, 1] },
      commit: 'immediate',
    })

    expect(nextHistory.past).toHaveLength(1)
    expect(nextHistory.present[0]?.position).toEqual([1, 0, 1])
  })

  it('applies deferred move without committing history', () => {
    const history = createHistoryState([createFurnitureItem('item-1', 0, 0)])
    const nextHistory = applyMoveSelectionResultToHistory({
      history,
      result: { ok: true, id: 'item-1', position: [1, 0, 1] },
      commit: 'defer',
    })

    expect(nextHistory.past).toHaveLength(0)
    expect(nextHistory.present[0]?.position).toEqual([1, 0, 1])
  })
})
