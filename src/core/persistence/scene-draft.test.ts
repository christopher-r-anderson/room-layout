// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import type { FurnitureItem } from '@/domain/furniture'
import { saveJson } from '@/shared/lib/ui/storage'
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
      lightingMoodId: 'warm-white',
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
      lightingMoodId: 'warm-white',
    })
  })

  it('round-trips a non-default room size, rounded to 3 decimals', () => {
    saveSceneDraft([], {
      roomSize: { width: 4.0004, depth: 5, height: 3 },
    })

    expect(loadSceneDraft()?.roomSize).toEqual({
      width: 4,
      depth: 5,
      height: 3,
    })
  })

  it('omits the room size at the default and loads it as undefined', () => {
    saveSceneDraft([makeFurnitureItem()], {
      roomSize: { width: 6, depth: 6, height: 2.5 },
    })

    const draft = loadSceneDraft()
    expect(draft).not.toBeNull()
    expect(draft?.roomSize).toBeUndefined()
  })

  it('returns null for invalid or incompatible payload', () => {
    // Write a future-version payload through the same storage API the module
    // uses, rather than coupling to the storage lib's key-prefixing.
    saveJson('scene-draft', { version: 2, items: [] })

    expect(loadSceneDraft()).toBeNull()
  })

  it('returns null for a draft with a malformed room size', () => {
    saveJson('scene-draft', {
      version: 1,
      items: [],
      roomSize: { width: -1, depth: 5, height: 3 },
    })

    expect(loadSceneDraft()).toBeNull()
  })

  it('clears the stored draft', () => {
    saveSceneDraft([makeFurnitureItem()])
    expect(loadSceneDraft()).not.toBeNull()

    clearSceneDraft()
    expect(loadSceneDraft()).toBeNull()
  })
})
