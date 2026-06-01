// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  commitHistoryPresent,
  createHistoryState,
} from '@/lib/ui/editor-history'
import type {
  FurnitureInstance,
  FurnitureItem,
} from '@/scene/objects/furniture.types'
import {
  clearSceneServices,
  registerSceneServices,
} from '@/scene/internal/scene-services'
import { sceneCommands } from '@/scene/scene-commands'
import {
  resetSceneStateStore,
  sceneStateActions,
  sceneStateStore,
  useEditorMessage,
  useFloorFinishId,
  useHasSelection,
  useHistoryAvailability,
  useItems,
  useItemIds,
  usePreviewedId,
  useSelectedId,
  useSelectedFurniture,
  useWallFinishId,
} from './scene-state-store'

const FURNITURE_ITEM: FurnitureItem = {
  id: 'item-1',
  catalogId: 'chair-1',
  collectionId: 'collection-1',
  footprintSize: { width: 1, depth: 1 },
  kind: 'armchair',
  name: 'Chair',
  nodeName: 'ChairNode',
  position: [0, 0, 0],
  rotationY: 0,
  sourcePath: '/models/chair.glb',
}

beforeEach(() => {
  resetSceneStateStore()
  clearSceneServices()
})

function seedSceneItems(
  items: FurnitureItem[],
  options?: { selectedId?: string | null },
) {
  sceneStateActions.setHistory(createHistoryState(items))
  sceneStateActions.setSelectedId(options?.selectedId ?? null)
}

function registerDefaultSceneServices(
  overrides: Partial<Parameters<typeof registerSceneServices>[0]> = {},
) {
  registerSceneServices({
    addFurniture: () => ({ ok: true, id: 'item-1' }),
    clearSelection: () => undefined,
    deleteSelection: () => true,
    focusSelected: () => undefined,
    getCameraPosition: () => [0, 0, 0],
    getSnapshot: () => ({
      cameraPosition: [0, 0, 0] as [number, number, number],
      items: [],
    }),
    moveSelection: () => ({ ok: false, reason: 'no-selection' }),
    redo: () => true,
    restoreInitialLayout: () => undefined,
    rotateSelection: () => undefined,
    selectById: () => ({ ok: true, status: 'selected' }),
    setCameraKeyState: () => undefined,
    setCameraPreset: () => undefined,
    setSelectionTransform: () => ({ ok: false, reason: 'no-selection' }),
    undo: () => true,
    ...overrides,
  })
}

describe('sceneStateStore', () => {
  it('derives selected furniture and selection presence from history and selected id', () => {
    const { result: items } = renderHook(() => useItems())
    const { result: selectedId } = renderHook(() => useSelectedId())
    const { result: selectedFurniture } = renderHook(() =>
      useSelectedFurniture(),
    )
    const { result: hasSelection } = renderHook(() => useHasSelection())

    act(() => {
      seedSceneItems([FURNITURE_ITEM], { selectedId: FURNITURE_ITEM.id })
    })

    expect(items.current).toEqual([FURNITURE_ITEM])
    expect(selectedId.current).toBe(FURNITURE_ITEM.id)
    expect(selectedFurniture.current).toEqual(FURNITURE_ITEM)
    expect(hasSelection.current).toBe(true)

    act(() => {
      sceneStateActions.setSelectedId(null)
    })

    expect(hasSelection.current).toBe(false)
  })

  it('tracks history availability and editor message', () => {
    const { result: historyAvailability } = renderHook(() =>
      useHistoryAvailability(),
    )
    const { result: editorMessage } = renderHook(() => useEditorMessage())

    act(() => {
      sceneStateActions.setHistory(
        commitHistoryPresent(createHistoryState<FurnitureItem[]>([]), [
          FURNITURE_ITEM,
        ]),
      )
      sceneStateActions.setEditorMessage('Unable to place furniture')
    })

    expect(historyAvailability.current).toEqual({
      canUndo: true,
      canRedo: false,
    })
    expect(editorMessage.current).toBe('Unable to place furniture')

    act(() => {
      sceneStateActions.clearEditorMessage()
    })

    expect(editorMessage.current).toBeNull()
  })

  it('derives history availability from store-owned history and dragging state', () => {
    const { result: historyAvailability } = renderHook(() =>
      useHistoryAvailability(),
    )

    act(() => {
      sceneStateActions.setHistory(
        commitHistoryPresent(createHistoryState<FurnitureItem[]>([]), [
          FURNITURE_ITEM,
        ]),
      )
    })

    expect(historyAvailability.current).toEqual({
      canUndo: true,
      canRedo: false,
    })

    act(() => {
      sceneStateActions.setDragging(true)
    })

    expect(historyAvailability.current).toEqual({
      canUndo: false,
      canRedo: false,
    })
  })

  it('tracks finish ids', () => {
    const { result: floorFinishId } = renderHook(() => useFloorFinishId())
    const { result: wallFinishId } = renderHook(() => useWallFinishId())

    act(() => {
      sceneStateActions.setFloorFinishId('oak-floor')
      sceneStateActions.setWallFinishId('white-wall')
    })

    expect(floorFinishId.current).toBe('oak-floor')
    expect(wallFinishId.current).toBe('white-wall')
  })

  it('updates selected id directly and clears preview when selection changes', () => {
    act(() => {
      sceneStateActions.setPreviewedId('item-1')
      sceneStateActions.setSelectedId('item-1')
    })

    expect(sceneStateStore.getState().selectedId).toBe('item-1')
    expect(sceneStateStore.getState().previewedIdRaw).toBeNull()

    act(() => {
      sceneStateActions.setPreviewedId('item-2')
      sceneStateActions.setSelectedId(null)
    })

    expect(sceneStateStore.getState().selectedId).toBeNull()
    expect(sceneStateStore.getState().previewedIdRaw).toBeNull()
  })

  it('returns stable item ids until the id list changes', () => {
    const items = [FURNITURE_ITEM]
    const { result } = renderHook(() => useItemIds())

    act(() => {
      seedSceneItems(items, { selectedId: FURNITURE_ITEM.id })
    })

    const initialIds = result.current

    act(() => {
      seedSceneItems(items, { selectedId: FURNITURE_ITEM.id })
    })

    expect(result.current).toBe(initialIds)
  })

  it('gates preview visibility during drag, overlays, disabled interactions, and missing ids', () => {
    const { result, rerender } = renderHook(
      (props: {
        isBlockingOverlayOpen: boolean
        editorInteractionsEnabled: boolean
      }) => usePreviewedId(props),
      {
        initialProps: {
          isBlockingOverlayOpen: false,
          editorInteractionsEnabled: true,
        },
      },
    )

    act(() => {
      seedSceneItems([FURNITURE_ITEM])
      sceneStateActions.setPreviewedId('item-1')
    })
    expect(result.current).toBe('item-1')

    act(() => {
      sceneStateActions.setDragging(true)
    })
    expect(result.current).toBeNull()

    act(() => {
      sceneStateActions.setDragging(false)
    })
    expect(result.current).toBe('item-1')

    rerender({
      isBlockingOverlayOpen: true,
      editorInteractionsEnabled: true,
    })
    expect(result.current).toBeNull()

    rerender({
      isBlockingOverlayOpen: false,
      editorInteractionsEnabled: false,
    })
    expect(result.current).toBeNull()

    act(() => {
      seedSceneItems([])
    })

    rerender({
      isBlockingOverlayOpen: false,
      editorInteractionsEnabled: true,
    })
    expect(result.current).toBeNull()
  })

  it('reconciles removed preview ids from the backing scene items', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    act(() => {
      seedSceneItems([FURNITURE_ITEM], { selectedId: FURNITURE_ITEM.id })
      sceneStateActions.setPreviewedId(FURNITURE_ITEM.id)
    })

    expect(sceneStateStore.getState().previewedIdRaw).toBe(FURNITURE_ITEM.id)

    act(() => {
      seedSceneItems([])
    })

    expect(sceneStateStore.getState().previewedIdRaw).toBeNull()
    expect(consoleErrorSpy).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('delegates restoreInitialLayout through registered scene services', () => {
    const clearSelection = vi.fn()
    const deleteSelection = vi.fn(() => true)
    const restoreInitialLayout = vi.fn()
    const instances: FurnitureInstance[] = [
      {
        id: 'furniture-instance-1',
        catalogId: 'chair-1',
        position: [0, 0, 0],
        rotationY: 0,
      },
    ]

    registerDefaultSceneServices({
      addFurniture: () => ({ ok: true, id: 'item-1' }),
      clearSelection,
      deleteSelection,
      focusSelected: () => undefined,
      moveSelection: () => ({ ok: false, reason: 'no-selection' }),
      redo: () => true,
      restoreInitialLayout,
      rotateSelection: () => undefined,
      selectById: () => ({ ok: true, status: 'selected' }),
      setCameraPreset: () => undefined,
      setSelectionTransform: () => ({ ok: false, reason: 'no-selection' }),
      undo: () => true,
    })

    act(() => {
      sceneCommands.restoreInitialLayout(instances)
    })

    expect(restoreInitialLayout).toHaveBeenCalledWith(instances)
  })

  it('delegates clearSelection through registered scene services', () => {
    const clearSelection = vi.fn()

    registerDefaultSceneServices({
      addFurniture: () => ({ ok: true, id: 'item-1' }),
      clearSelection,
      deleteSelection: () => true,
      focusSelected: () => undefined,
      moveSelection: () => ({ ok: false, reason: 'no-selection' }),
      redo: () => true,
      restoreInitialLayout: () => undefined,
      rotateSelection: () => undefined,
      selectById: () => ({ ok: true, status: 'selected' }),
      setCameraPreset: () => undefined,
      setSelectionTransform: () => ({ ok: false, reason: 'no-selection' }),
      undo: () => true,
    })

    act(() => {
      sceneCommands.clearSelection()
    })

    expect(clearSelection).toHaveBeenCalledTimes(1)
  })

  it('delegates deleteSelection through registered scene services', () => {
    const deleteSelection = vi.fn(() => true)

    registerDefaultSceneServices({
      addFurniture: () => ({ ok: true, id: 'item-1' }),
      clearSelection: () => undefined,
      deleteSelection,
      focusSelected: () => undefined,
      moveSelection: () => ({ ok: false, reason: 'no-selection' }),
      redo: () => true,
      restoreInitialLayout: () => undefined,
      rotateSelection: () => undefined,
      selectById: () => ({ ok: true, status: 'selected' }),
      setCameraPreset: () => undefined,
      setSelectionTransform: () => ({ ok: false, reason: 'no-selection' }),
      undo: () => true,
    })

    let deleted = false

    act(() => {
      deleted = sceneCommands.deleteSelection()
    })

    expect(deleted).toBe(true)
    expect(deleteSelection).toHaveBeenCalledTimes(1)
  })

  it('delegates undo and redo through registered scene services', () => {
    const undo = vi.fn(() => true)
    const redo = vi.fn(() => false)

    registerDefaultSceneServices({
      addFurniture: () => ({ ok: true, id: 'item-1' }),
      clearSelection: () => undefined,
      deleteSelection: () => true,
      focusSelected: () => undefined,
      moveSelection: () => ({ ok: false, reason: 'no-selection' }),
      redo,
      restoreInitialLayout: () => undefined,
      rotateSelection: () => undefined,
      selectById: () => ({ ok: true, status: 'selected' }),
      setCameraPreset: () => undefined,
      setSelectionTransform: () => ({ ok: false, reason: 'no-selection' }),
      undo,
    })

    let didUndo = false
    let didRedo = true

    act(() => {
      didUndo = sceneCommands.undo()
      didRedo = sceneCommands.redo()
    })

    expect(didUndo).toBe(true)
    expect(didRedo).toBe(false)
    expect(undo).toHaveBeenCalledTimes(1)
    expect(redo).toHaveBeenCalledTimes(1)
  })

  it('delegates selectById through registered scene services', () => {
    const selectById = vi.fn(() => ({
      ok: true as const,
      status: 'selected' as const,
    }))

    registerDefaultSceneServices({
      addFurniture: () => ({ ok: true, id: 'item-1' }),
      clearSelection: () => undefined,
      deleteSelection: () => true,
      focusSelected: () => undefined,
      moveSelection: () => ({ ok: false, reason: 'no-selection' }),
      redo: () => true,
      restoreInitialLayout: () => undefined,
      rotateSelection: () => undefined,
      selectById,
      setCameraPreset: () => undefined,
      setSelectionTransform: () => ({ ok: false, reason: 'no-selection' }),
      undo: () => true,
    })

    let result: ReturnType<typeof sceneCommands.selectById> | null = null

    act(() => {
      result = sceneCommands.selectById('item-1')
    })

    expect(result).toEqual({ ok: true, status: 'selected' })
    expect(selectById).toHaveBeenCalledWith('item-1')
  })

  it('delegates addFurniture through registered scene services', () => {
    const addFurniture = vi.fn(() => ({ ok: true as const, id: 'item-1' }))

    registerDefaultSceneServices({
      addFurniture,
      clearSelection: () => undefined,
      deleteSelection: () => true,
      focusSelected: () => undefined,
      moveSelection: () => ({ ok: false, reason: 'no-selection' }),
      redo: () => true,
      restoreInitialLayout: () => undefined,
      rotateSelection: () => undefined,
      selectById: () => ({ ok: true, status: 'selected' }),
      setCameraPreset: () => undefined,
      setSelectionTransform: () => ({ ok: false, reason: 'no-selection' }),
      undo: () => true,
    })

    let result: ReturnType<typeof sceneCommands.addFurniture> | null = null

    act(() => {
      result = sceneCommands.addFurniture('catalog-chair')
    })

    expect(result).toEqual({ ok: true, id: 'item-1' })
    expect(addFurniture).toHaveBeenCalledWith('catalog-chair')
  })

  it('delegates moveSelection and setSelectionTransform through registered scene services', () => {
    const moveSelection = vi.fn(() => ({
      ok: true as const,
      position: [0.5, 0, 0] as [number, number, number],
    }))
    const setSelectionTransform = vi.fn(() => ({
      ok: true as const,
      item: {
        ...FURNITURE_ITEM,
        position: [1, 0, 0] as [number, number, number],
      },
    }))

    registerDefaultSceneServices({
      addFurniture: () => ({ ok: true, id: 'item-1' }),
      clearSelection: () => undefined,
      deleteSelection: () => true,
      focusSelected: () => undefined,
      moveSelection,
      redo: () => true,
      restoreInitialLayout: () => undefined,
      rotateSelection: () => undefined,
      selectById: () => ({ ok: true, status: 'selected' }),
      setCameraPreset: () => undefined,
      setSelectionTransform,
      undo: () => true,
    })

    let moveResult: ReturnType<typeof sceneCommands.moveSelection> | null = null
    let transformResult: ReturnType<
      typeof sceneCommands.setSelectionTransform
    > | null = null

    act(() => {
      moveResult = sceneCommands.moveSelection(
        { x: 0.5, z: 0 },
        { source: 'keyboard' },
      )
      transformResult = sceneCommands.setSelectionTransform({
        position: [1, 0, 0],
      })
    })

    expect(moveResult).toEqual({ ok: true, position: [0.5, 0, 0] })
    expect(transformResult).toEqual({
      ok: true,
      item: {
        ...FURNITURE_ITEM,
        position: [1, 0, 0],
      },
    })
    expect(moveSelection).toHaveBeenCalledWith(
      { x: 0.5, z: 0 },
      { source: 'keyboard' },
    )
    expect(setSelectionTransform).toHaveBeenCalledWith({
      position: [1, 0, 0],
    })
  })

  it('delegates rotateSelection through registered scene services', () => {
    const rotateSelection = vi.fn()

    registerDefaultSceneServices({
      addFurniture: () => ({ ok: true, id: 'item-1' }),
      clearSelection: () => undefined,
      deleteSelection: () => true,
      focusSelected: () => undefined,
      moveSelection: () => ({ ok: false, reason: 'no-selection' }),
      redo: () => true,
      restoreInitialLayout: () => undefined,
      rotateSelection,
      selectById: () => ({ ok: true, status: 'selected' }),
      setCameraPreset: () => undefined,
      setSelectionTransform: () => ({ ok: false, reason: 'no-selection' }),
      undo: () => true,
    })

    act(() => {
      sceneCommands.rotateSelection(Math.PI / 4)
    })

    expect(rotateSelection).toHaveBeenCalledWith(Math.PI / 4)
  })

  it('delegates setCameraKeyState through registered scene services', () => {
    const setCameraKeyState = vi.fn()
    const keyState = new Set(['keyW'] as const)

    registerDefaultSceneServices({
      setCameraKeyState,
    })

    act(() => {
      sceneCommands.setCameraKeyState(keyState)
    })

    expect(setCameraKeyState).toHaveBeenCalledWith(keyState)
  })

  it('reads getCameraPosition through registered scene services', () => {
    registerDefaultSceneServices({
      getCameraPosition: () => [1.235, 2.345, 3.457],
    })

    expect(sceneCommands.getCameraPosition()).toEqual([1.235, 2.345, 3.457])
  })

  it('tracks scene readiness via registered services', () => {
    expect(sceneCommands.isSceneReady()).toBe(false)

    registerDefaultSceneServices()
    expect(sceneCommands.isSceneReady()).toBe(true)

    clearSceneServices()
    expect(sceneCommands.isSceneReady()).toBe(false)
  })

  it('reads getSnapshot through registered scene services', () => {
    const snapshot = {
      cameraPosition: [0, 0, 0] as [number, number, number],
      items: [],
    }

    registerDefaultSceneServices({
      getSnapshot: () => snapshot,
    })

    expect(sceneCommands.getSnapshot()).toBe(snapshot)
  })

  it('delegates focusSelected and setCameraPreset through registered scene services', () => {
    const focusSelected = vi.fn()
    const setCameraPreset = vi.fn()

    registerDefaultSceneServices({
      addFurniture: () => ({ ok: true, id: 'item-1' }),
      clearSelection: () => undefined,
      deleteSelection: () => true,
      focusSelected,
      moveSelection: () => ({ ok: false, reason: 'no-selection' }),
      redo: () => true,
      restoreInitialLayout: () => undefined,
      rotateSelection: () => undefined,
      selectById: () => ({ ok: true, status: 'selected' }),
      setCameraPreset,
      setSelectionTransform: () => ({ ok: false, reason: 'no-selection' }),
      undo: () => true,
    })

    act(() => {
      sceneCommands.focusSelected()
      sceneCommands.setCameraPreset('top')
    })

    expect(focusSelected).toHaveBeenCalledTimes(1)
    expect(setCameraPreset).toHaveBeenCalledWith('top')
  })
})
