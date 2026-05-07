// @vitest-environment jsdom

import { createRef, type RefObject } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Object3D, PerspectiveCamera } from 'three'
import {
  createHistoryState,
  commitHistoryPresent,
  undoHistoryState,
} from '@/lib/ui/editor-history'
import { useSceneImperativeApi } from './use-scene-imperative-api'
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import type { LayoutBounds } from '@/lib/three/furniture-layout'
import type { SceneRef } from '../scene.types'
import type { FurnitureItem } from '../objects/furniture.types'

const {
  mockAddFurnitureToHistory,
  mockDeleteSelectionFromHistory,
  mockCreateSceneSnapshot,
} = vi.hoisted(() => ({
  mockAddFurnitureToHistory: vi.fn(),
  mockDeleteSelectionFromHistory: vi.fn(),
  mockCreateSceneSnapshot: vi.fn(),
}))

vi.mock('./furniture-operations', () => ({
  addFurnitureToHistory: mockAddFurnitureToHistory,
  createFurnitureInstanceId: (sequenceNumber: number) =>
    `furniture-instance-${String(sequenceNumber)}`,
  deleteSelectionFromHistory: mockDeleteSelectionFromHistory,
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
    ref: createRef<SceneRef>(),
    bounds: {
      minX: -5,
      maxX: 5,
      minZ: -5,
      maxZ: 5,
    } satisfies LayoutBounds,
    camera: new PerspectiveCamera(),
    canvasSize: { width: 800, height: 600 },
    catalog: [],
    clearDragState: vi.fn(),
    collections: [],
    dragState: null,
    edgeSnapThreshold: 0.25,
    furniture: [],
    history: createHistoryState<FurnitureItem[]>([]),
    instanceIdRef: { current: 0 },
    objectRefs: { current: new Map<string, Object3D>() },
    rotateSelectedFurniture: vi.fn(),
    selectFurniture: vi.fn(),
    selectedId: null,
    setHistory: vi.fn(),
    setSelectedIdAndResolveObject: vi.fn(),
    snapSize: 1,
    sourceScenesByPath: new Map<string, Object3D>(),
    ...overrides,
  }
}

function getSceneRef(options: Parameters<typeof useSceneImperativeApi>[0]) {
  return options.ref as RefObject<SceneRef | null>
}

describe('useSceneImperativeApi', () => {
  beforeEach(() => {
    mockAddFurnitureToHistory.mockReset()
    mockDeleteSelectionFromHistory.mockReset()
    mockCreateSceneSnapshot.mockReset()

    mockAddFurnitureToHistory.mockReturnValue({
      history: createHistoryState<FurnitureItem[]>([]),
      result: { ok: true, id: 'item-1' },
      incrementInstanceId: true,
    })

    mockDeleteSelectionFromHistory.mockReturnValue({
      history: createHistoryState<FurnitureItem[]>([]),
      deleted: false,
      deletedId: null,
    })

    mockCreateSceneSnapshot.mockReturnValue({})
  })

  it('clearSelection calls selectFurniture(null) when not dragging', () => {
    const options = defaultOptions()
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.clearSelection()
    })

    expect(options.selectFurniture).toHaveBeenCalledWith(null)
  })

  it('clearSelection is a no-op while dragging', () => {
    const options = defaultOptions({ dragState: { id: 'item-1' } })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.clearSelection()
    })

    expect(options.selectFurniture).not.toHaveBeenCalled()
  })

  it('rotateSelection forwards delta to rotateSelectedFurniture', () => {
    const options = defaultOptions()
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.rotateSelection(Math.PI / 4)
    })

    expect(options.rotateSelectedFurniture).toHaveBeenCalledWith(Math.PI / 4)
  })

  it('selectById returns not-found for unknown ids and selected for known ids', () => {
    const item = createFurnitureItem('item-1')
    const options = defaultOptions({
      furniture: [item],
      history: createHistoryState([item]),
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let missingResult: ReturnType<SceneRef['selectById']> | null = null
    let selectedResult: ReturnType<SceneRef['selectById']> | null = null

    act(() => {
      missingResult = sceneRef.current?.selectById('missing-id') ?? null
      selectedResult = sceneRef.current?.selectById('item-1') ?? null
    })

    expect(missingResult).toEqual({
      ok: false,
      status: 'not-found',
    })
    expect(selectedResult).toEqual({
      ok: true,
      status: 'selected',
    })
    expect(options.setSelectedIdAndResolveObject).toHaveBeenCalledWith('item-1')
  })

  it('selectById returns blocked-dragging while dragging', () => {
    const item = createFurnitureItem('item-1')
    const options = defaultOptions({
      furniture: [item],
      history: createHistoryState([item]),
      dragState: { id: 'item-1' },
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result: ReturnType<SceneRef['selectById']> | null = null

    act(() => {
      result = sceneRef.current?.selectById('item-1') ?? null
    })

    expect(result).toEqual({
      ok: false,
      status: 'blocked-dragging',
    })
  })

  it('getReadModel returns latest selected id and items', () => {
    const initialItem = createFurnitureItem('item-1')
    const options = defaultOptions({
      furniture: [initialItem],
      history: createHistoryState([initialItem]),
      selectedId: null,
    })

    const { rerender } = renderHook(
      ({ currentOptions }) => {
        useSceneImperativeApi(currentOptions)
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
      history: createHistoryState([updatedItem]),
      selectedId: 'item-2',
    })
    const updatedRef = getSceneRef(updatedOptions)

    rerender({ currentOptions: updatedOptions })

    let readModel: ReturnType<SceneRef['getReadModel']> | null = null

    act(() => {
      readModel = updatedRef.current?.getReadModel() ?? null
    })

    expect(readModel).toEqual({
      selectedId: 'item-2',
      items: [updatedItem],
    })
  })

  it('moveSelection returns no-selection when there is no selected item', () => {
    const options = defaultOptions()
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result: ReturnType<SceneRef['moveSelection']> | null = null

    act(() => {
      result = sceneRef.current?.moveSelection({ x: 0.5, z: 0 }) ?? null
    })

    expect(result).toEqual({
      ok: false,
      reason: 'no-selection',
    })
  })

  it('moveSelection returns dragging while pointer drag is active', () => {
    const item = createFurnitureItem('item-1')
    const options = defaultOptions({
      furniture: [item],
      history: createHistoryState([item]),
      selectedId: 'item-1',
      dragState: { id: 'item-1' },
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result: ReturnType<SceneRef['moveSelection']> | null = null

    act(() => {
      result = sceneRef.current?.moveSelection({ x: 0.5, z: 0 }) ?? null
    })

    expect(result).toEqual({
      ok: false,
      reason: 'dragging',
    })
  })

  it('moveSelection commits one undo step per successful movement action', () => {
    const item = createFurnitureItem('item-1')
    const options = defaultOptions({
      furniture: [item],
      history: createHistoryState([item]),
      selectedId: 'item-1',
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let firstMove: ReturnType<SceneRef['moveSelection']> | null = null

    act(() => {
      firstMove = sceneRef.current?.moveSelection({ x: 0.5, z: 0 }) ?? null
    })

    expect(firstMove).toEqual({
      ok: true,
      position: [0.5, 0, 0],
    })
    expect(options.setHistory).toHaveBeenCalledTimes(1)

    const committedHistory = vi.mocked(options.setHistory).mock.calls[0][0]

    if (typeof committedHistory === 'function') {
      throw new Error('expected committed history object')
    }

    expect(committedHistory.past).toHaveLength(1)
    expect(committedHistory.past[0][0].position).toEqual([0, 0, 0])
    expect(committedHistory.present[0].position).toEqual([0.5, 0, 0])
  })

  it('moveSelection returns no-op for zero delta movement', () => {
    const item = createFurnitureItem('item-1')
    const options = defaultOptions({
      furniture: [item],
      history: createHistoryState([item]),
      selectedId: 'item-1',
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result: ReturnType<SceneRef['moveSelection']> | null = null

    act(() => {
      result = sceneRef.current?.moveSelection({ x: 0, z: 0 }) ?? null
    })

    expect(result).toEqual({
      ok: false,
      reason: 'no-op',
    })
    expect(options.setHistory).not.toHaveBeenCalled()
  })

  it('moveSelection returns blocked-bounds when movement is clamped to current position', () => {
    const item = createFurnitureItem('item-1')
    item.position = [0.5, 0, 0]
    const options = defaultOptions({
      bounds: {
        minX: -1,
        maxX: 1,
        minZ: -1,
        maxZ: 1,
      },
      furniture: [item],
      history: createHistoryState([item]),
      selectedId: 'item-1',
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result: ReturnType<SceneRef['moveSelection']> | null = null

    act(() => {
      result = sceneRef.current?.moveSelection({ x: 1, z: 0 }) ?? null
    })

    expect(result).toEqual({
      ok: false,
      reason: 'blocked-bounds',
    })
  })

  it('moveSelection returns blocked-collision when the proposed move overlaps another item', () => {
    const movingItem = createFurnitureItem('item-1')
    movingItem.position = [0, 0, 0]
    const blockingItem = createFurnitureItem('item-2')
    blockingItem.position = [0.5, 0, 0]
    const options = defaultOptions({
      furniture: [movingItem, blockingItem],
      history: createHistoryState([movingItem, blockingItem]),
      selectedId: 'item-1',
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result: ReturnType<SceneRef['moveSelection']> | null = null

    act(() => {
      result = sceneRef.current?.moveSelection({ x: 0.5, z: 0 }) ?? null
    })

    expect(result).toEqual({
      ok: false,
      reason: 'blocked-collision',
    })
  })

  it('undo returns false when no undo is available', () => {
    const options = defaultOptions({ history: createHistoryState([]) })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let didUndo = false
    act(() => {
      didUndo = sceneRef.current?.undo() ?? false
    })

    expect(didUndo).toBe(false)
    expect(options.setHistory).not.toHaveBeenCalled()
  })

  it('undo returns true and updates history and selected object when available', () => {
    const item = createFurnitureItem('item-1')
    const historyWithUndo = commitHistoryPresent(createHistoryState([item]), [])
    const selectedId = 'missing-id'
    const expected = undoSceneHistory({
      history: historyWithUndo,
      selectedId,
      isDragging: false,
    })
    const options = defaultOptions({
      history: historyWithUndo,
      selectedId,
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let didUndo = false
    act(() => {
      didUndo = sceneRef.current?.undo() ?? false
    })

    expect(didUndo).toBe(true)
    expect(options.setHistory).toHaveBeenCalledTimes(1)
    expect(options.setHistory).toHaveBeenCalledWith(expected.history)
    expect(options.setSelectedIdAndResolveObject).toHaveBeenCalledWith(
      expected.selectedId,
    )
  })

  it('redo returns true and updates history and selected object when available', () => {
    const item = createFurnitureItem('item-1')
    const committed = commitHistoryPresent(
      createHistoryState<FurnitureItem[]>([]),
      [item],
    )
    const historyWithRedo = undoHistoryState(committed)
    const selectedId = 'missing-id'
    const expected = redoSceneHistory({
      history: historyWithRedo,
      selectedId,
      isDragging: false,
    })
    const options = defaultOptions({
      history: historyWithRedo,
      selectedId,
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let didRedo = false
    act(() => {
      didRedo = sceneRef.current?.redo() ?? false
    })

    expect(didRedo).toBe(true)
    expect(options.setHistory).toHaveBeenCalledTimes(1)
    expect(options.setHistory).toHaveBeenCalledWith(expected.history)
    expect(options.setSelectedIdAndResolveObject).toHaveBeenCalledWith(
      expected.selectedId,
    )
  })

  it('deleteSelection returns false when nothing is selected', () => {
    const options = defaultOptions({ selectedId: null })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let didDelete = false
    act(() => {
      didDelete = sceneRef.current?.deleteSelection() ?? false
    })

    expect(didDelete).toBe(false)
  })

  it('deleteSelection returns true and clears selected id on success', () => {
    const nextHistory = createHistoryState<FurnitureItem[]>([])
    mockDeleteSelectionFromHistory.mockReturnValueOnce({
      history: nextHistory,
      deleted: true,
      deletedId: 'item-1',
    })
    const options = defaultOptions({ selectedId: 'item-1' })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let didDelete = false
    act(() => {
      didDelete = sceneRef.current?.deleteSelection() ?? false
    })

    expect(didDelete).toBe(true)
    expect(options.setSelectedIdAndResolveObject).toHaveBeenCalledWith(null)
  })

  it('deleteSelection updates the read model immediately after a successful delete', () => {
    const item = createFurnitureItem('item-1')
    const nextHistory = createHistoryState<FurnitureItem[]>([])
    mockDeleteSelectionFromHistory.mockReturnValueOnce({
      history: nextHistory,
      deleted: true,
      deletedId: 'item-1',
    })
    const options = defaultOptions({
      furniture: [item],
      history: createHistoryState([item]),
      selectedId: 'item-1',
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let readModel: ReturnType<SceneRef['getReadModel']> | null = null

    act(() => {
      sceneRef.current?.deleteSelection()
      readModel = sceneRef.current?.getReadModel() ?? null
    })

    expect(readModel).toEqual({
      selectedId: null,
      items: [],
    })
  })

  it('deleteSelection clears drag state when deleting the dragged item', () => {
    const nextHistory = createHistoryState<FurnitureItem[]>([])
    mockDeleteSelectionFromHistory.mockReturnValueOnce({
      history: nextHistory,
      deleted: true,
      deletedId: 'item-1',
    })
    const options = defaultOptions({
      selectedId: 'item-1',
      dragState: { id: 'item-1' },
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.deleteSelection()
    })

    expect(options.clearDragState).toHaveBeenCalledTimes(1)
  })

  it('addFurniture selects result id and increments instance id on success', () => {
    const nextHistory = createHistoryState<FurnitureItem[]>([
      createFurnitureItem('item-1'),
    ])
    mockAddFurnitureToHistory.mockReturnValueOnce({
      history: nextHistory,
      result: { ok: true, id: 'item-1' },
      incrementInstanceId: true,
    })
    const options = defaultOptions()
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.addFurniture('catalog-chair')
    })

    expect(options.setSelectedIdAndResolveObject).toHaveBeenCalledWith('item-1')
    expect(options.instanceIdRef.current).toBe(1)
  })

  it('getSnapshot uses latest furniture and selectedId after rerender', () => {
    const options = defaultOptions({
      furniture: [createFurnitureItem('item-1')],
      selectedId: null,
    })

    const { rerender } = renderHook(
      ({ currentOptions }) => {
        useSceneImperativeApi(currentOptions)
      },
      {
        initialProps: {
          currentOptions: options,
        },
      },
    )

    const updatedOptions = defaultOptions({
      furniture: [createFurnitureItem('item-2')],
      selectedId: 'item-2',
    })
    const updatedRef = getSceneRef(updatedOptions)

    rerender({ currentOptions: updatedOptions })

    act(() => {
      updatedRef.current?.getSnapshot()
    })

    expect(mockCreateSceneSnapshot).toHaveBeenCalledWith(
      updatedOptions.furniture,
      'item-2',
      updatedOptions.objectRefs.current,
      updatedOptions.camera,
      updatedOptions.canvasSize,
    )
  })
})
