// @vitest-environment jsdom

import { useEffect } from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Object3D, PerspectiveCamera } from 'three'
import { useSceneSnapshot } from './use-scene-snapshot'
import type { SceneSnapshot } from '@/core/scene.types'
import type { FurnitureItem } from '@/domain/furniture'

const { mockCreateSceneSnapshot } = vi.hoisted(() => ({
  mockCreateSceneSnapshot: vi.fn(),
}))

vi.mock('./scene-snapshot', () => ({
  createSceneSnapshot: mockCreateSceneSnapshot,
}))

function createFurnitureItem(id: string): FurnitureItem {
  return {
    id,
    catalogId: 'catalog-chair',
    name: `Chair ${id}`,
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [0, 0, 0],
    rotationY: 0,
  }
}

function defaultOptions(
  overrides: Partial<Parameters<typeof useSceneSnapshot>[0]> = {},
): Parameters<typeof useSceneSnapshot>[0] {
  return {
    camera: new PerspectiveCamera(),
    canvasSize: { width: 800, height: 600 },
    furniture: [],
    objectRefs: { current: new Map<string, Object3D>() },
    ...overrides,
  }
}

describe('useSceneSnapshot', () => {
  beforeEach(() => {
    mockCreateSceneSnapshot.mockReset()

    mockCreateSceneSnapshot.mockImplementation(
      (furniture: FurnitureItem[]) => ({
        cameraPosition: [0, 0, 0] as [number, number, number],
        items: furniture.map((item) => ({
          id: item.id,
          catalogId: item.catalogId,
          name: item.name,
          position: item.position,
          rotationY: item.rotationY,
          pointerTarget: null,
        })),
      }),
    )
  })

  it('returns a stable getter across rerenders', () => {
    const { result, rerender } = renderHook(
      ({ currentOptions }) => useSceneSnapshot(currentOptions),
      {
        initialProps: {
          currentOptions: defaultOptions({
            furniture: [createFurnitureItem('item-1')],
          }),
        },
      },
    )

    const firstGetter = result.current

    rerender({
      currentOptions: defaultOptions({
        furniture: [createFurnitureItem('item-2')],
      }),
    })

    // Callers hold this getter, so its identity must survive prop changes.
    expect(result.current).toBe(firstGetter)
  })

  it('updates getSnapshot before earlier passive effects observe a rerendered furniture change', () => {
    const initialItem = createFurnitureItem('item-1')
    const initialOptions = defaultOptions({
      furniture: [initialItem],
    })
    const observedSnapshots: SceneSnapshot[] = []

    const { rerender } = renderHook(
      ({ currentOptions }) => {
        const getSnapshot = useSceneSnapshot(currentOptions)

        useEffect(() => {
          const snapshot = getSnapshot()

          observedSnapshots.push(snapshot)
        }, [currentOptions, getSnapshot])
      },
      {
        initialProps: {
          currentOptions: initialOptions,
        },
      },
    )

    const updatedItem = {
      ...initialItem,
      position: [-2.5, 0, -1.5] as [number, number, number],
    }

    rerender({
      currentOptions: {
        ...initialOptions,
        furniture: [updatedItem],
      },
    })

    expect(observedSnapshots).toHaveLength(2)
    expect(observedSnapshots[1]).toEqual(
      expect.objectContaining({
        items: [
          expect.objectContaining({
            id: updatedItem.id,
            position: updatedItem.position,
            rotationY: updatedItem.rotationY,
          }),
        ],
      }),
    )
  })

  it('getSnapshot uses latest furniture after rerender', () => {
    const options = defaultOptions({
      furniture: [createFurnitureItem('item-1')],
    })

    const { result, rerender } = renderHook(
      ({ currentOptions }) => {
        return useSceneSnapshot(currentOptions)
      },
      {
        initialProps: {
          currentOptions: options,
        },
      },
    )

    const updatedOptions = defaultOptions({
      furniture: [createFurnitureItem('item-2')],
    })
    rerender({ currentOptions: updatedOptions })

    act(() => {
      result.current()
    })

    expect(mockCreateSceneSnapshot).toHaveBeenCalledWith(
      updatedOptions.furniture,
      updatedOptions.objectRefs.current,
      updatedOptions.camera,
      updatedOptions.canvasSize,
    )
  })
})
