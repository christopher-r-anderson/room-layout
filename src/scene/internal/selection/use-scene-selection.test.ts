// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { Group } from 'three'
import {
  resetSelectionStore,
  selectionActions,
} from '@/core/stores/selection-store'
import { createDummyMesh } from '@/test/support/three-fixtures'
import { useSceneSelection } from './use-scene-selection'

beforeEach(() => {
  resetSelectionStore()
})

describe('useSceneSelection', () => {
  it('starts with no selection state', () => {
    const { result } = renderHook(() => useSceneSelection())

    expect(result.current.selectedId).toBeNull()
    expect(result.current.selection).toEqual([])
  })

  it('reflects the selection store pointer', () => {
    const { result } = renderHook(() => useSceneSelection())

    act(() => {
      selectionActions.setSelection('item-2', 'canvas-pointer')
    })

    expect(result.current.selectedId).toBe('item-2')

    act(() => {
      selectionActions.setSelection(null, null)
    })

    expect(result.current.selectedId).toBeNull()
    expect(result.current.selection).toEqual([])
  })

  it('registerObject(id, object) stores object in objectRefs', () => {
    const { result } = renderHook(() => useSceneSelection())
    const object = new Group()

    act(() => {
      result.current.registerObject('item-1', object)
    })

    expect(result.current.objectRefs.current.get('item-1')).toBe(object)
  })

  it('registerObject(id, null) removes the object and clears selectedObject-derived meshes', () => {
    const { result } = renderHook(() => useSceneSelection())
    const object = new Group()
    object.add(createDummyMesh())

    act(() => {
      result.current.registerObject('item-1', object)
      selectionActions.setSelection('item-1', 'canvas-pointer')
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

  it('resolves the selected object through registered refs', () => {
    const { result } = renderHook(() => useSceneSelection())
    const object = new Group()
    object.add(createDummyMesh())

    act(() => {
      result.current.registerObject('item-1', object)
      selectionActions.setSelection('item-1', 'canvas-pointer')
    })

    expect(result.current.selectedId).toBe('item-1')
    expect(result.current.selection).toHaveLength(1)
  })

  it('selection derives from getMeshes(selectedObject)', () => {
    const { result } = renderHook(() => useSceneSelection())
    const object = new Group()
    const meshA = createDummyMesh()
    const meshB = createDummyMesh()
    object.add(meshA, meshB)

    act(() => {
      result.current.registerObject('item-1', object)
      selectionActions.setSelection('item-1', 'canvas-pointer')
    })

    expect(result.current.selection).toHaveLength(2)
    expect(result.current.selection).toContain(meshA)
    expect(result.current.selection).toContain(meshB)
  })

  it('late registerObject resolves selectedObject for an already-selected id', () => {
    const { result } = renderHook(() => useSceneSelection())
    const object = new Group()
    object.add(createDummyMesh())

    act(() => {
      selectionActions.setSelection('item-1', 'canvas-pointer')
    })

    expect(result.current.selectedId).toBe('item-1')
    expect(result.current.selection).toEqual([])

    act(() => {
      result.current.registerObject('item-1', object)
    })

    expect(result.current.selection).toHaveLength(1)
  })
})
