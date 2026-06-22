// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { clearSceneDraft, loadSceneDraft, saveSceneDraft } from './scene-draft'

function makeFurnitureItem(overrides?: Partial<FurnitureItem>): FurnitureItem {
  return {
    id: 'furniture-instance-1',
    catalogId: 'catalog-chair',
    name: 'Chair',
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [1.23456, 0, -2.34567],
    rotationY: 1.5708,
    ...overrides,
  }
}

describe('scene draft storage', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns null when no draft is present', () => {
    expect(loadSceneDraft()).toBeNull()
  })

  it('saves and loads normalized draft payload', () => {
    const items = [
      makeFurnitureItem({ id: 'furniture-instance-2', rotationY: 1.23456 }),
      makeFurnitureItem({ id: 'furniture-instance-1', rotationY: 2.34567 }),
    ]

    saveSceneDraft(items, {
      floorFinishId: 'granite-tile',
      wallFinishId: 'sage-green',
    })

    expect(loadSceneDraft()).toEqual({
      items: [
        {
          id: 'furniture-instance-1',
          catalogId: 'catalog-chair',
          position: [1.235, 0, -2.346],
          rotationY: 2.346,
        },
        {
          id: 'furniture-instance-2',
          catalogId: 'catalog-chair',
          position: [1.235, 0, -2.346],
          rotationY: 1.235,
        },
      ],
      floorFinishId: 'granite-tile',
      wallFinishId: 'sage-green',
    })
  })

  it('returns null for invalid or incompatible payload', () => {
    window.localStorage.setItem(
      'room-layout:scene-draft',
      JSON.stringify({ version: 2, items: [] }),
    )

    expect(loadSceneDraft()).toBeNull()
  })

  it('clears the stored draft', () => {
    saveSceneDraft([makeFurnitureItem()])
    expect(loadSceneDraft()).not.toBeNull()

    clearSceneDraft()
    expect(loadSceneDraft()).toBeNull()
  })
})
