// @vitest-environment jsdom

import { createRef, type RefObject } from 'react'
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { Object3D, PerspectiveCamera } from 'three'
import {
  createHistoryState,
  commitHistoryPresent,
  undoHistoryState,
  type HistoryState,
} from '@/lib/ui/editor-history'
import { useSceneImperativeApi } from './use-scene-imperative-api'
import { redoSceneHistory, undoSceneHistory } from './scene-history-state'
import type { LayoutBounds } from '@/lib/three/furniture-layout'
import type { SceneRef } from './scene.types'
import type { FurnitureItem } from './objects/furniture.types'

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
  areFurnitureCollectionsEqual: (
    left: FurnitureItem[],
    right: FurnitureItem[],
  ) => JSON.stringify(left) === JSON.stringify(right),
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
    clearDragState: vi.fn(),
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

  it('selectById returns invalid-id when furniture id is missing', () => {
    const options = defaultOptions({
      furniture: [createFurnitureItem('item-1')],
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result
    act(() => {
      result = sceneRef.current?.selectById('missing')
    })

    expect(result).toEqual({ ok: false, reason: 'invalid-id' })
    expect(options.setSelectedIdAndResolveObject).not.toHaveBeenCalled()
  })

  it('selectById sets selection when id exists', () => {
    const options = defaultOptions({
      furniture: [createFurnitureItem('item-1')],
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result
    act(() => {
      result = sceneRef.current?.selectById('item-1')
    })

    expect(result).toEqual({ ok: true, id: 'item-1' })
    expect(options.setSelectedIdAndResolveObject).toHaveBeenCalledWith('item-1')
  })

  it('moveSelection returns none-selected with null selection', () => {
    const options = defaultOptions({
      furniture: [createFurnitureItem('item-1')],
      selectedId: null,
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result
    act(() => {
      result = sceneRef.current?.moveSelection({ x: 1, z: 1 })
    })

    expect(result).toEqual({ ok: false, reason: 'none-selected' })
  })

  it('moveSelection applies immediate move as committed history', () => {
    const item = createFurnitureItem('item-1')
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
      furniture: [item],
      history: createHistoryState([item]),
      selectedId: 'item-1',
      setHistory,
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result
    act(() => {
      result = sceneRef.current?.moveSelection(
        { x: 1, z: 0 },
        { commit: 'immediate' },
      )
    })

    expect(result).toEqual({ ok: true, id: 'item-1', position: [1, 0, 0] })
    expect(options.setHistory).toHaveBeenCalledTimes(1)
    const nextHistory = setHistory.mock.calls[0]?.[0] as
      | HistoryState<FurnitureItem[]>
      | undefined
    expect(nextHistory).toBeDefined()
    expect(nextHistory.past).toHaveLength(1)
  })

  it('setSelectionPosition applies deferred move without history commit', () => {
    const item = createFurnitureItem('item-1')
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
      furniture: [item],
      history: createHistoryState([item]),
      selectedId: 'item-1',
      setHistory,
    })
    const sceneRef = getSceneRef(options)
    renderHook(() => {
      useSceneImperativeApi(options)
    })

    let result
    act(() => {
      result = sceneRef.current?.setSelectionPosition(
        { x: 2, z: 0 },
        { commit: 'defer' },
      )
    })

    expect(result).toEqual({ ok: true, id: 'item-1', position: [2, 0, 0] })
    const nextHistory = setHistory.mock.calls[0]?.[0] as
      | HistoryState<FurnitureItem[]>
      | undefined
    expect(nextHistory).toBeDefined()
    expect(nextHistory.past).toHaveLength(0)
  })
})
