// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, beforeEach, vi } from 'vitest'
import { Ray, Vector3 } from 'three'
import {
  createHistoryState,
  type HistoryState,
} from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { useSceneDrag } from './use-scene-drag'
import type { LayoutBounds } from '@/domain/geometry/furniture-layout'
import type { FurnitureItem } from '@/domain/furniture'

const {
  mockGetFloorIntersection,
  mockGetDraggedFurniturePosition,
  mockResolveMovedFurniturePosition,
} = vi.hoisted(() => ({
  mockGetFloorIntersection: vi.fn(),
  mockGetDraggedFurniturePosition: vi.fn(),
  mockResolveMovedFurniturePosition: vi.fn(),
}))

vi.mock('./furniture-drag', () => ({
  getFloorIntersection: mockGetFloorIntersection,
  getDraggedFurniturePosition: mockGetDraggedFurniturePosition,
}))

vi.mock('@/domain/geometry/furniture-layout', () => ({
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
    updateHistory: vi.fn(),
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
    resetSceneDocumentStore()
    mockGetFloorIntersection.mockReset()
    mockGetDraggedFurniturePosition.mockReset()
    mockResolveMovedFurniturePosition.mockReset()
    mockGetFloorIntersection.mockReturnValue({ x: 1, z: 2 })
    mockGetDraggedFurniturePosition.mockReturnValue([2, 0, 3])
    mockResolveMovedFurniturePosition.mockReturnValue([2, 0, 3])
  })

  afterEach(() => {
    resetSceneDocumentStore()
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
    // The document drag flag is written synchronously with the gesture.
    expect(useSceneDocumentStore.getState().isDragging).toBe(true)
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
    expect(options.updateHistory).not.toHaveBeenCalled()
  })

  it('handleDragEnd clears drag state and passes a history updater callback', () => {
    const startFurniture = [createFurnitureItem('item-1')]
    const updateHistory =
      vi.fn<
        (
          next: (
            history: HistoryState<FurnitureItem[]>,
          ) => HistoryState<FurnitureItem[]>,
        ) => void
      >()
    const options = defaultOptions({
      furniture: startFurniture,
      updateHistory,
    })
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
    })

    act(() => {
      result.current.handleDragEnd('item-1')
    })

    expect(result.current.dragState).toBeNull()
    expect(useSceneDocumentStore.getState().isDragging).toBe(false)
    expect(updateHistory).toHaveBeenCalledTimes(1)

    const updateHistoryArg = updateHistory.mock.calls[0]?.[0]
    expect(updateHistoryArg).toEqual(expect.any(Function))
  })

  it('clears the drag flag when the hook unmounts mid-drag', () => {
    const options = defaultOptions()
    const { result, unmount } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
    })
    expect(useSceneDocumentStore.getState().isDragging).toBe(true)

    unmount()

    expect(useSceneDocumentStore.getState().isDragging).toBe(false)
  })

  it('clears the gesture when the dragged item leaves the document mid-drag', () => {
    const options = defaultOptions()
    // In production the furniture prop is derived from the document store;
    // seed the store to match so the existence subscription sees the item.
    sceneDocumentActions.setHistory(createHistoryState(options.furniture))
    const { result } = renderHook(() => useSceneDrag(options))

    act(() => {
      result.current.handleDragStart('item-1', createPointerEvent(1))
    })
    expect(result.current.dragState).not.toBeNull()
    expect(useSceneDocumentStore.getState().isDragging).toBe(true)

    // Simulate a keyboard delete landing while the pointer is still down.
    act(() => {
      sceneDocumentActions.setHistory(createHistoryState<FurnitureItem[]>([]))
    })

    expect(result.current.dragState).toBeNull()
    expect(useSceneDocumentStore.getState().isDragging).toBe(false)
  })
})
