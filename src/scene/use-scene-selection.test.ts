// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { Group } from 'three'
import { createDummyMesh } from '@/test/three-fixtures'
import { useSceneSelection } from './use-scene-selection'
import type { FurnitureItem } from './objects/furniture.types'

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

describe('useSceneSelection', () => {
  it('starts with no selection state', () => {
    const { result } = renderHook(() =>
      useSceneSelection({ furniture: [createFurnitureItem('item-1')] }),
    )

    expect(result.current.selectedId).toBeNull()
    expect(result.current.selectedFurniture).toBeNull()
    expect(result.current.selection).toEqual([])
  })

  it('selectFurniture(id) resolves selected id and furniture', () => {
    const furniture = [
      createFurnitureItem('item-1'),
      createFurnitureItem('item-2'),
    ]
    const { result } = renderHook(() => useSceneSelection({ furniture }))

    act(() => {
      result.current.selectFurniture('item-2')
    })

    expect(result.current.selectedId).toBe('item-2')
    expect(result.current.selectedFurniture?.id).toBe('item-2')
  })

  it('selectFurniture(null) clears selection', () => {
    const furniture = [createFurnitureItem('item-1')]
    const { result } = renderHook(() => useSceneSelection({ furniture }))

    act(() => {
      result.current.selectFurniture('item-1')
    })
    expect(result.current.selectedId).toBe('item-1')

    act(() => {
      result.current.selectFurniture(null)
    })

    expect(result.current.selectedId).toBeNull()
    expect(result.current.selectedFurniture).toBeNull()
  })

  it('selectFurniture(unknown-id) actively clears selection from a non-null state', () => {
    const furniture = [createFurnitureItem('item-1')]
    const { result } = renderHook(() => useSceneSelection({ furniture }))

    act(() => {
      result.current.selectFurniture('item-1')
    })
    expect(result.current.selectedId).toBe('item-1')

    act(() => {
      result.current.selectFurniture('missing-id')
    })

    expect(result.current.selectedId).toBeNull()
    expect(result.current.selectedFurniture).toBeNull()
  })

  it('registerObject(id, object) stores object in objectRefs', () => {
    const { result } = renderHook(() =>
      useSceneSelection({ furniture: [createFurnitureItem('item-1')] }),
    )
    const object = new Group()

    act(() => {
      result.current.registerObject('item-1', object)
    })

    expect(result.current.objectRefs.current.get('item-1')).toBe(object)
  })

  it('registerObject(id, null) removes the object and clears selectedObject-derived meshes', () => {
    const { result } = renderHook(() =>
      useSceneSelection({ furniture: [createFurnitureItem('item-1')] }),
    )
    const object = new Group()
    object.add(createDummyMesh())

    act(() => {
      result.current.registerObject('item-1', object)
      result.current.setSelectedIdAndResolveObject('item-1')
    })

    expect(result.current.selectedId).toBe('item-1')
    expect(result.current.selection).toHaveLength(1)

    act(() => {
      result.current.registerObject('item-1', null)
    })

    expect(result.current.objectRefs.current.has('item-1')).toBe(false)
    expect(result.current.selectedId).toBe('item-1')
    expect(result.current.selection).toEqual([])
  })

  it('setSelectedIdAndResolveObject(id) resolves selectedObject through registered refs', () => {
    const { result } = renderHook(() =>
      useSceneSelection({ furniture: [createFurnitureItem('item-1')] }),
    )
    const object = new Group()
    object.add(createDummyMesh())

    act(() => {
      result.current.registerObject('item-1', object)
      result.current.setSelectedIdAndResolveObject('item-1')
    })

    expect(result.current.selectedId).toBe('item-1')
    expect(result.current.selection).toHaveLength(1)
  })

  it('calls onSelectionChange on real selection changes but not unrelated rerenders', () => {
    const onSelectionChange = vi.fn()
    const furniture = [createFurnitureItem('item-1')]

    const { result, rerender } = renderHook(() =>
      useSceneSelection({
        furniture,
        onSelectionChange,
      }),
    )

    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(onSelectionChange).toHaveBeenLastCalledWith(null)

    act(() => {
      result.current.selectFurniture('item-1')
    })

    expect(onSelectionChange).toHaveBeenCalledTimes(2)
    expect(onSelectionChange).toHaveBeenLastCalledWith(furniture[0])

    rerender()

    expect(onSelectionChange).toHaveBeenCalledTimes(2)
  })

  it('selection derives from getMeshes(selectedObject)', () => {
    const { result } = renderHook(() =>
      useSceneSelection({ furniture: [createFurnitureItem('item-1')] }),
    )
    const object = new Group()
    const meshA = createDummyMesh()
    const meshB = createDummyMesh()
    object.add(meshA, meshB)

    act(() => {
      result.current.registerObject('item-1', object)
      result.current.setSelectedIdAndResolveObject('item-1')
    })

    expect(result.current.selection).toHaveLength(2)
    expect(result.current.selection).toContain(meshA)
    expect(result.current.selection).toContain(meshB)
  })

  it('late registerObject resolves selectedObject for an already-selected id', () => {
    const { result } = renderHook(() =>
      useSceneSelection({ furniture: [createFurnitureItem('item-1')] }),
    )
    const object = new Group()
    object.add(createDummyMesh())

    act(() => {
      result.current.setSelectedIdAndResolveObject('item-1')
    })

    expect(result.current.selectedId).toBe('item-1')
    expect(result.current.selection).toEqual([])

    act(() => {
      result.current.registerObject('item-1', object)
    })

    expect(result.current.selection).toHaveLength(1)
  })
})
