// @vitest-environment jsdom

import { createRef, type RefObject } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Object3D, PerspectiveCamera } from 'three'
import type { CameraControlsImpl } from '@react-three/drei'
import {
  createHistoryState,
  commitHistoryPresent,
  undoHistoryState,
} from '@/lib/ui/editor-history'
import { useSceneImperativeApi } from './use-scene-imperative-api'
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import type { LayoutBounds } from '@/lib/three/furniture-layout'
import type { CameraKeyName, SceneRef } from '../scene.types'
import type {
  FurnitureInstance,
  FurnitureItem,
} from '../objects/furniture.types'

const {
  mockAddFurnitureToHistory,
  mockBuildFurnitureItemsFromInstances,
  mockDeleteSelectionFromHistory,
  mockCreateSceneSnapshot,
  mockUseFrame,
} = vi.hoisted(() => ({
  mockAddFurnitureToHistory: vi.fn(),
  mockBuildFurnitureItemsFromInstances: vi.fn(),
  mockDeleteSelectionFromHistory: vi.fn(),
  mockCreateSceneSnapshot: vi.fn(),
  mockUseFrame: vi.fn(),
}))

vi.mock('@react-three/fiber', () => ({
  useFrame: mockUseFrame,
}))

vi.mock('./furniture-operations', () => ({
  addFurnitureToHistory: mockAddFurnitureToHistory,
  areFurnitureCollectionsEqual: (
    left: FurnitureItem[],
    right: FurnitureItem[],
  ) =>
    left.length === right.length &&
    left.every((item, index) => {
      const other = right[index]
      return (
        item.id === other.id &&
        item.catalogId === other.catalogId &&
        item.name === other.name &&
        item.kind === other.kind &&
        item.collectionId === other.collectionId &&
        item.nodeName === other.nodeName &&
        item.sourcePath === other.sourcePath &&
        item.footprintSize.width === other.footprintSize.width &&
        item.footprintSize.depth === other.footprintSize.depth &&
        item.position[0] === other.position[0] &&
        item.position[1] === other.position[1] &&
        item.position[2] === other.position[2] &&
        item.rotationY === other.rotationY
      )
    }),
  buildFurnitureItemsFromInstances: mockBuildFurnitureItemsFromInstances,
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
    cameraControlsRef: { current: null },
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
    mockBuildFurnitureItemsFromInstances.mockReset()
    mockDeleteSelectionFromHistory.mockReset()
    mockCreateSceneSnapshot.mockReset()
    mockUseFrame.mockReset()

    mockAddFurnitureToHistory.mockReturnValue({
      history: createHistoryState<FurnitureItem[]>([]),
      result: { ok: true, id: 'item-1' },
      incrementInstanceId: true,
    })

    mockBuildFurnitureItemsFromInstances.mockReturnValue([])

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

  it('setSelectionTransform commits a valid exact transform as one history step', () => {
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

    let result: ReturnType<SceneRef['setSelectionTransform']> | null = null

    act(() => {
      result =
        sceneRef.current?.setSelectionTransform({
          position: [1.25, 0, -0.75],
          rotationY: Math.PI / 6,
        }) ?? null
    })

    expect(result).toEqual({
      ok: true,
      item: {
        ...item,
        position: [1.25, 0, -0.75],
        rotationY: Math.PI / 6,
      },
    })
    expect(options.setHistory).toHaveBeenCalledTimes(1)

    const committedHistory = vi.mocked(options.setHistory).mock.calls[0][0]

    if (typeof committedHistory === 'function') {
      throw new Error('expected committed history object')
    }

    expect(committedHistory.past).toHaveLength(1)
    expect(committedHistory.present[0].position).toEqual([1.25, 0, -0.75])
    expect(committedHistory.present[0].rotationY).toBeCloseTo(Math.PI / 6)
  })

  it('setSelectionTransform rejects exact transforms that fall outside room bounds', () => {
    const item = createFurnitureItem('item-1')
    const options = defaultOptions({
      bounds: {
        minX: -0.5,
        maxX: 0.5,
        minZ: -0.5,
        maxZ: 0.5,
      },
      furniture: [item],
      history: createHistoryState([item]),
      selectedId: 'item-1',
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result: ReturnType<SceneRef['setSelectionTransform']> | null = null

    act(() => {
      result =
        sceneRef.current?.setSelectionTransform({
          position: [1, 0, 0],
        }) ?? null
    })

    expect(result).toEqual({
      ok: false,
      reason: 'blocked-bounds',
    })
    expect(options.setHistory).not.toHaveBeenCalled()
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

  it('setCameraPreset delegates to camera controls setLookAt', () => {
    const setLookAt = vi
      .fn<CameraControlsImpl['setLookAt']>()
      .mockResolvedValue(undefined)
    const controls = {
      setLookAt,
    } as Pick<CameraControlsImpl, 'setLookAt'>
    const options = defaultOptions({
      cameraControlsRef: {
        current: controls as CameraControlsImpl,
      },
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.setCameraPreset('top')
    })

    expect(setLookAt).toHaveBeenCalledTimes(1)
  })

  it('focusSelected delegates to camera controls fitToBox for the selected object', () => {
    const selectedObject = new Object3D()
    const fitToBox = vi
      .fn<CameraControlsImpl['fitToBox']>()
      .mockResolvedValue([])
    const controls = {
      fitToBox,
    } as Pick<CameraControlsImpl, 'fitToBox'>
    const options = defaultOptions({
      selectedId: 'item-1',
      objectRefs: {
        current: new Map<string, Object3D>([['item-1', selectedObject]]),
      },
      cameraControlsRef: {
        current: controls as CameraControlsImpl,
      },
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.focusSelected()
    })

    expect(fitToBox).toHaveBeenCalledWith(selectedObject, true, {
      paddingTop: 0.5,
      paddingBottom: 0.5,
      paddingLeft: 0.5,
      paddingRight: 0.5,
    })
  })

  it('applies continuous camera motion using the render-loop delta', () => {
    let frameCallback: ((state: unknown, delta: number) => void) | undefined
    mockUseFrame.mockImplementation((callback) => {
      frameCallback = callback as (state: unknown, delta: number) => void
    })

    const truck = vi
      .fn<CameraControlsImpl['truck']>()
      .mockResolvedValue(undefined)
    const rotate = vi
      .fn<CameraControlsImpl['rotate']>()
      .mockResolvedValue(undefined)
    const dolly = vi
      .fn<CameraControlsImpl['dolly']>()
      .mockResolvedValue(undefined)
    const controls = {
      truck,
      rotate,
      dolly,
    } as unknown as CameraControlsImpl
    const options = defaultOptions({
      cameraControlsRef: {
        current: controls,
      },
    })
    const sceneRef = getSceneRef(options)

    renderHook(() => {
      useSceneImperativeApi(options)
    })

    // Orbit (rotate) with W
    act(() => {
      const keyState = new Set<CameraKeyName>(['keyW'])
      sceneRef.current?.setCameraKeyState(keyState)
      frameCallback?.({}, 0.025)
    })
    expect(rotate).toHaveBeenCalledWith(0, -1.5 * 0.025, false)

    // Pan (truck) with Shift+W
    act(() => {
      const keyState = new Set<CameraKeyName>(['keyW', 'shift'])
      sceneRef.current?.setCameraKeyState(keyState)
      frameCallback?.({}, 0.025)
    })
    expect(truck).toHaveBeenCalledWith(0, -3 * 0.025, false)

    // Zoom in with =
    act(() => {
      const keyState = new Set<CameraKeyName>(['equal'])
      sceneRef.current?.setCameraKeyState(keyState)
      frameCallback?.({}, 0.025)
    })
    expect(dolly).toHaveBeenCalledWith(3 * 0.025, false)

    // Zoom out with -
    act(() => {
      const keyState = new Set<CameraKeyName>(['minus'])
      sceneRef.current?.setCameraKeyState(keyState)
      frameCallback?.({}, 0.025)
    })
    expect(dolly).toHaveBeenCalledWith(-3 * 0.025, false)

    // Shift+Minus still zooms and does not introduce pan/orbit side effects.
    act(() => {
      const keyState = new Set<CameraKeyName>(['shift', 'minus'])
      sceneRef.current?.setCameraKeyState(keyState)
      frameCallback?.({}, 0.025)
    })
    expect(dolly).toHaveBeenCalledWith(-3 * 0.025, false)
    expect(truck).toHaveBeenCalledTimes(1)
    expect(rotate).toHaveBeenCalledTimes(1)
  })
})

describe('restoreInitialLayout', () => {
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

    const options = defaultOptions()
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.restoreInitialLayout([
        makeInstance('furniture-instance-1'),
      ])
    })

    const readModel = sceneRef.current?.getReadModel()
    expect(readModel?.items).toHaveLength(1)
    expect(readModel?.items[0].id).toBe('furniture-instance-1')
  })

  it('clears selection after restore', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-1')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const options = defaultOptions()
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.restoreInitialLayout([
        makeInstance('furniture-instance-1'),
      ])
    })

    expect(sceneRef.current?.getReadModel().selectedId).toBeNull()
    expect(options.setSelectedIdAndResolveObject).toHaveBeenCalledWith(null)
  })

  it('establishes empty undo/redo history baseline', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-2')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const options = defaultOptions()
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.restoreInitialLayout([
        makeInstance('furniture-instance-2'),
      ])
    })

    // Undo should return false since the restore IS the baseline
    const undoResult = sceneRef.current?.undo()
    expect(undoResult).toBe(false)
  })

  it('reseeds instanceIdRef to max restored suffix', () => {
    const restoredItems = [
      makeFurnitureItem('furniture-instance-5'),
      makeFurnitureItem('furniture-instance-3'),
    ]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const instanceIdRef = { current: 0 }
    const options = defaultOptions({ instanceIdRef })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.restoreInitialLayout([
        makeInstance('furniture-instance-5'),
        makeInstance('furniture-instance-3'),
      ])
    })

    expect(instanceIdRef.current).toBe(5)
  })

  it('handles instances with non-standard id format gracefully', () => {
    const restoredItems = [makeFurnitureItem('custom-id')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const instanceIdRef = { current: 0 }
    const options = defaultOptions({ instanceIdRef })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.restoreInitialLayout([makeInstance('custom-id')])
    })

    // Non-standard ids produce suffix=0, so instanceIdRef stays at 0
    expect(instanceIdRef.current).toBe(0)
  })

  it('calls setHistory with a fresh history state', () => {
    const restoredItems = [makeFurnitureItem('furniture-instance-1')]
    mockBuildFurnitureItemsFromInstances.mockReturnValue(restoredItems)

    const options = defaultOptions()
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    act(() => {
      sceneRef.current?.restoreInitialLayout([
        makeInstance('furniture-instance-1'),
      ])
    })

    expect(options.setHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        past: [],
        present: restoredItems,
        future: [],
      }),
    )
  })

  it('propagates errors from buildFurnitureItemsFromInstances', () => {
    mockBuildFurnitureItemsFromInstances.mockImplementation(() => {
      throw new Error('node not found')
    })

    const options = defaultOptions()
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    expect(() => {
      act(() => {
        sceneRef.current?.restoreInitialLayout([
          makeInstance('furniture-instance-1'),
        ])
      })
    }).toThrow('node not found')
  })
})
