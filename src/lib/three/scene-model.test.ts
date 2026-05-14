import { describe, expect, it } from 'vitest'
import { hasNoFurniture, isSceneStateAtDefaults } from './scene-model'

describe('scene-model', () => {
  it('reports when a scene has no furniture', () => {
    expect(hasNoFurniture({ items: [] })).toBe(true)
    expect(
      hasNoFurniture({
        items: [
          {
            catalogId: 'chair-1',
            position: [0, 0, 0],
            rotationY: 0,
          },
        ],
      }),
    ).toBe(false)
  })

  it('matches defaults without depending on item ids or insertion order', () => {
    const defaults = {
      items: [
        {
          catalogId: 'chair-1',
          position: [1, 0, 2] as [number, number, number],
          rotationY: 0,
        },
        {
          catalogId: 'table-1',
          position: [0, 0, 0] as [number, number, number],
          rotationY: Math.PI / 2,
        },
      ],
      floorFinishId: 'wood-floor',
      wallFinishId: 'light-gray',
    }

    const state = {
      items: [
        {
          catalogId: 'table-1',
          position: [0, 0, 0] as [number, number, number],
          rotationY: Math.PI / 2,
        },
        {
          catalogId: 'chair-1',
          position: [1, 0, 2] as [number, number, number],
          rotationY: 0,
        },
      ],
      floorFinishId: 'wood-floor',
      wallFinishId: 'light-gray',
    }

    expect(isSceneStateAtDefaults(state, defaults)).toBe(true)
  })

  it('returns false when finishes or furniture differ from defaults', () => {
    const defaults = {
      items: [],
      floorFinishId: 'wood-floor',
      wallFinishId: 'light-gray',
    }

    expect(
      isSceneStateAtDefaults(
        {
          items: [],
          floorFinishId: 'granite-tile',
          wallFinishId: 'light-gray',
        },
        defaults,
      ),
    ).toBe(false)

    expect(
      isSceneStateAtDefaults(
        {
          items: [
            {
              catalogId: 'chair-1',
              position: [0, 0, 0] as [number, number, number],
              rotationY: 0,
            },
          ],
          floorFinishId: 'wood-floor',
          wallFinishId: 'light-gray',
        },
        defaults,
      ),
    ).toBe(false)
  })
})
