// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Ray, Vector3 } from 'three'
import type { HistoryState } from '@/lib/ui/editor-history'
import { useSceneDrag } from './use-scene-drag'
import type { LayoutBounds } from '@/lib/three/furniture-layout'
import type { FurnitureItem } from '../objects/furniture.types'

const {
  mockGetFloorIntersection,
  mockGetDraggedFurniturePosition,
  mockResolveMovedFurniturePosition,
} = vi.hoisted(() => ({
  mockGetFloorIntersection: vi.fn(),
  mockGetDraggedFurniturePosition: vi.fn(),
  mockResolveMovedFurniturePosition: vi.fn(),
}))

vi.mock('@/lib/three/furniture-drag', () => ({
  getFloorIntersection: mockGetFloorIntersection,
  getDraggedFurniturePosition: mockGetDraggedFurniturePosition,
}))

vi.mock('@/lib/three/furniture-layout', () => ({
  resolveMovedFurniturePosition: mockResolveMovedFurniturePosition,
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

function createPointerEvent(pointerId: number) {
  return {
    pointerId,
    ray: new Ray(new Vector3(0, 1, 0), new Vector3(0, -1, 0)),
    // Keep this minimal on purpose: these tests only exercise ray/pointerId paths.
  } as unknown as Parameters<ReturnType<typeof useSceneDrag>['handleMove']>[1]
}

function defaultOptions(
  overrides: Partial<Parameters<typeof useSceneDrag>[0]> = {},
): Parameters<typeof useSceneDrag>[0] {
  const furniture = [createFurnitureItem('item-1')]

  return {
    furniture,
    selectFurniture: vi.fn(),
    updateFurniturePosition: vi.fn(),
    setHistory: vi.fn(),
    bounds: {
      minX: -5,
      maxX: 5,
      minZ: -5,
      maxZ: 5,
    } satisfies LayoutBounds,
    floorPlaneY: 0,
    snapSize: 1,
    edgeSnapThreshold: 0.25,
    areFurnitureCollectionsEqual: (left, right) => left === right,
    ...overrides,
  }
}

describe('useSceneDrag', () => {
  beforeEach(() => {
    mockGetFloorIntersection.mockReset()
    mockGetDraggedFurniturePosition.mockReset()
    mockResolveMovedFurniturePosition.mockReset()
    mockGetFloorIntersection.mockReturnValue({ x: 1, z: 2 })
    mockGetDraggedFurniturePosition.mockReturnValue([2, 0, 3])
    mockResolveMovedFurniturePosition.mockReturnValue([2, 0, 3])
  })

  it('handleDragStart keeps dragState null when furniture is missing', () => {
    const options = defaultOptions({ furniture: [] })
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('missing-id', createPointerEvent(1))
    })

    expect(result.current.dragState).toBeNull()
  })

  it('handleDragStart keeps dragState null when floor intersection is null', () => {
    mockGetFloorIntersection.mockReturnValueOnce(null)
    const options = defaultOptions()
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
    })

    expect(result.current.dragState).toBeNull()
  })

  it('handleDragStart sets dragState and selects furniture on success', () => {
    const options = defaultOptions({
      furniture: [
        {
          ...createFurnitureItem('item-1'),
          position: [3, 0, 5],
        },
      ],
    })
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(7))
    })

    // offset = activeFurniture.position - floorIntersection => (3 - 1, 5 - 2)
    expect(result.current.dragState).toEqual({
      id: 'item-1',
      pointerId: 7,
      offset: {
        x: 2,
        z: 3,
      },
    })
    expect(options.selectFurniture).toHaveBeenCalledWith('item-1')
  })

  it('handleMove ignores mismatched id', () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
      result.current.handleMove('item-2', createPointerEvent(1))
    })

    expect(options.updateFurniturePosition).not.toHaveBeenCalled()
  })

  it('handleMove ignores mismatched pointerId', () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
      result.current.handleMove('item-1', createPointerEvent(2))
    })

    expect(options.updateFurniturePosition).not.toHaveBeenCalled()
  })

  it('handleMove exits when furniture is missing', () => {
    const options = defaultOptions()
    const { result, rerender } = renderHook(
      ({ currentOptions }) => useSceneDrag(currentOptions),
      { initialProps: { currentOptions: options } },
    )

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
    })

    rerender({ currentOptions: { ...options, furniture: [] } })

    act(() => {
      result.current.handleMove('item-1', createPointerEvent(1))
    })

    expect(options.updateFurniturePosition).not.toHaveBeenCalled()
  })

  it('handleMove exits when nextPosition is null', () => {
    mockGetDraggedFurniturePosition.mockReturnValueOnce(null)
    const options = defaultOptions()
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
      result.current.handleMove('item-1', createPointerEvent(1))
    })

    expect(options.updateFurniturePosition).not.toHaveBeenCalled()
  })

  it('handleMove exits when resolvedPosition is null', () => {
    mockResolveMovedFurniturePosition.mockReturnValueOnce(null)
    const options = defaultOptions()
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
      result.current.handleMove('item-1', createPointerEvent(1))
    })

    expect(options.updateFurniturePosition).not.toHaveBeenCalled()
  })

  it('handleMove updates furniture position on success', () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
    })

    act(() => {
      result.current.handleMove('item-1', createPointerEvent(1))
    })

    expect(options.updateFurniturePosition).toHaveBeenCalledWith(
      'item-1',
      [2, 0, 3],
    )
  })

  it('handleDragEnd ignores mismatched id and does not update history', () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
      result.current.handleDragEnd('item-2')
    })

    expect(result.current.dragState).not.toBeNull()
    expect(options.setHistory).not.toHaveBeenCalled()
  })

  it('handleDragEnd clears drag state and passes a history updater callback', () => {
    const startFurniture = [createFurnitureItem('item-1')]
    const setHistory =
      vi.fn<
        (
          next:
            | HistoryState<FurnitureItem[]>
            | ((
                history: HistoryState<FurnitureItem[]>,
              ) => HistoryState<FurnitureItem[]>),
        ) => void
      >()
    const options = defaultOptions({
      furniture: startFurniture,
      setHistory,
    })
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
    })

    act(() => {
      result.current.handleDragEnd('item-1')
    })

    expect(result.current.dragState).toBeNull()
    expect(setHistory).toHaveBeenCalledTimes(1)

    const setHistoryArg = setHistory.mock.calls[0]?.[0]
    expect(setHistoryArg).toEqual(expect.any(Function))
  })

  it('clearDragState resets dragState to null', () => {
    const options = defaultOptions()
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
    })
    expect(result.current.dragState).not.toBeNull()

    act(() => {
      result.current.clearDragState()
    })

    expect(result.current.dragState).toBeNull()
  })
})
