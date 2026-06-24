// @vitest-environment jsdom

import { useEffect } from 'react'
import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Object3D, PerspectiveCamera } from 'three'
import {
  buildRestoredSceneHistory,
  getMaxRestoredInstanceSuffix,
  useSceneImperativeApi,
} from './use-scene-imperative-api'
import type { SceneSnapshot } from './scene-snapshot'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import type { FurnitureInstance, FurnitureItem } from '@/domain/furniture'

const { mockBuildFurnitureItemsFromInstances, mockCreateSceneSnapshot } =
  vi.hoisted(() => ({
    mockBuildFurnitureItemsFromInstances: vi.fn(),
    mockCreateSceneSnapshot: vi.fn(),
  }))

vi.mock('./furniture-operations', () => ({
  buildFurnitureItemsFromInstances: mockBuildFurnitureItemsFromInstances,
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
  overrides: Partial<Parameters<typeof useSceneImperativeApi>[0]> = {},
): Parameters<typeof useSceneImperativeApi>[0] {
  return {
    camera: new PerspectiveCamera(),
    canvasSize: { width: 800, height: 600 },
    furniture: [],
    objectRefs: { current: new Map<string, Object3D>() },
    ...overrides,
  }
}

const EMPTY_CATALOG: FurnitureCatalogEntry[] = []
const EMPTY_COLLECTIONS: FurnitureCollection[] = []
const EMPTY_SOURCE_SCENES = new Map<string, Object3D>()

describe('useSceneImperativeApi', () => {
  beforeEach(() => {
    mockBuildFurnitureItemsFromInstances.mockReset()
    mockCreateSceneSnapshot.mockReset()

    mockBuildFurnitureItemsFromInstances.mockReturnValue([])

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

  it('getSnapshot returns latest items', () => {
    const initialItem = createFurnitureItem('item-1')
    const options = defaultOptions({
      furniture: [initialItem],
    })

    const { result, rerender } = renderHook(
      ({ currentOptions }) => {
        return useSceneImperativeApi(currentOptions)
      },
      {
        initialProps: {
          currentOptions: options,
        },
      },
    )

    const updatedItem = createFurnitureItem('item-2')
    const updatedOptions = defaultOptions({
      furniture: [updatedItem],
    })

    rerender({ currentOptions: updatedOptions })

    const snapshot = result.current()

    expect(snapshot.items).toEqual([
      expect.objectContaining({
        id: updatedItem.id,
        catalogId: updatedItem.catalogId,
        name: updatedItem.name,
        position: updatedItem.position,
        rotationY: updatedItem.rotationY,
      }),
    ])
  })

  it('updates getSnapshot before earlier passive effects observe a rerendered furniture change', () => {
    const initialItem = createFurnitureItem('item-1')
    const initialOptions = defaultOptions({
      furniture: [initialItem],
    })
    const observedSnapshots: SceneSnapshot[] = []

    const { rerender } = renderHook(
      ({ currentOptions }) => {
        const getSnapshot = useSceneImperativeApi(currentOptions)

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
        return useSceneImperativeApi(currentOptions)
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

describe('buildRestoredSceneHistory', () => {
  function makeInstance(
    id: string,
    overrides?: Partial<FurnitureInstance>,
  ): FurnitureInstance {
    return {
      id,
      catalogId: 'catalog-chair',
      position: [0, 0, 0],
      rotationY: 0,
      ...overrides,
    }
  }

  function makeFurnitureItem(id: string): FurnitureItem {
    return {
      id,
      catalogId: 'catalog-chair',
      name: 'Chair',
      kind: 'armchair',
      collectionId: 'collection-1',
      nodeName: 'ChairNode',
      sourcePath: '/models/chair.glb',
      footprintSize: { width: 1, depth: 1 },
      position: [0, 0, 0],
      rotationY: 0,
    }
  }

  it('seeds the scene with reconstructed furniture items', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-1')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const restoredState = buildRestoredSceneHistory({
      instances: [makeInstance('furniture-instance-1')],
      catalog: EMPTY_CATALOG,
      collections: EMPTY_COLLECTIONS,
      sourceScenesByPath: EMPTY_SOURCE_SCENES,
    })

    expect(restoredState.restoredItems).toEqual(restoredItems)
    expect(restoredState.history.present).toEqual(restoredItems)
  })

  it('establishes empty undo/redo history baseline', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-2')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const restoredState = buildRestoredSceneHistory({
      instances: [makeInstance('furniture-instance-2')],
      catalog: EMPTY_CATALOG,
      collections: EMPTY_COLLECTIONS,
      sourceScenesByPath: EMPTY_SOURCE_SCENES,
    })

    expect(restoredState.history).toEqual(
      expect.objectContaining({
        past: [],
        present: restoredItems,
        future: [],
      }),
    )
  })

  it('reseeds instanceIdRef to max restored suffix', () => {
    expect(
      getMaxRestoredInstanceSuffix([
        makeInstance('furniture-instance-5'),
        makeInstance('furniture-instance-3'),
      ]),
    ).toBe(5)
  })

  it('handles instances with non-standard id format gracefully', () => {
    expect(getMaxRestoredInstanceSuffix([makeInstance('custom-id')])).toBe(0)
  })

  it('tracks the instance id seed from the restored instances', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-1')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const restoredState = buildRestoredSceneHistory({
      instances: [makeInstance('furniture-instance-1')],
      catalog: EMPTY_CATALOG,
      collections: EMPTY_COLLECTIONS,
      sourceScenesByPath: EMPTY_SOURCE_SCENES,
    })

    expect(restoredState.instanceIdSeed).toBe(1)
  })

  it('propagates errors from buildFurnitureItemsFromInstances', () => {
    mockBuildFurnitureItemsFromInstances.mockImplementation(() => {
      throw new Error('node not found')
    })

    expect(() => {
      buildRestoredSceneHistory({
        instances: [makeInstance('furniture-instance-1')],
        catalog: EMPTY_CATALOG,
        collections: EMPTY_COLLECTIONS,
        sourceScenesByPath: EMPTY_SOURCE_SCENES,
      })
    }).toThrow('node not found')
  })
})
