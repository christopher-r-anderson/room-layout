// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  commitHistoryPresent,
  createHistoryState,
} from '@/shared/lib/ui/editor-history'
import type { FurnitureInstance, FurnitureItem } from '@/domain/furniture'
import { makeFurnitureItem } from '@/test/support/furniture'
import {
  clearSceneServices,
  registerSceneServices,
} from '@/core/scene-services'
import { sceneCommands } from '@/core/scene-commands'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
  useFloorFinishId,
  useFloorFinishLoading,
  useHasSelection,
  useHistoryAvailability,
  useItems,
  useLightingMoodId,
  useSelectedId,
  useSelectedFurniture,
  useWallFinishId,
} from './scene-document-store'

const FURNITURE_ITEM = makeFurnitureItem({ id: 'item-1', catalogId: 'chair-1' })

beforeEach(() => {
  resetSceneDocumentStore()
  clearSceneServices()
})

function seedSceneItems(
  items: FurnitureItem[],
  options?: { selectedId?: string | null },
) {
  sceneDocumentActions.setHistory(createHistoryState(items))
  sceneDocumentActions.setSelectedId(options?.selectedId ?? null)
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
    loadCollectionScene: () => Promise.resolve(),
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

describe('useSceneDocumentStore', () => {
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
      sceneDocumentActions.setSelectedId(null)
    })

    expect(hasSelection.current).toBe(false)
  })

  it('derives history availability from store-owned history and dragging state', () => {
    const { result: historyAvailability } = renderHook(() =>
      useHistoryAvailability(),
    )

    act(() => {
      sceneDocumentActions.setHistory(
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
      sceneDocumentActions.setDragging(true)
    })

    expect(historyAvailability.current).toEqual({
      canUndo: false,
      canRedo: false,
    })
  })

  it('tracks finish ids and the lighting mood', () => {
    const { result: floorFinishId } = renderHook(() => useFloorFinishId())
    const { result: wallFinishId } = renderHook(() => useWallFinishId())
    const { result: lightingMoodId } = renderHook(() => useLightingMoodId())

    act(() => {
      sceneDocumentActions.setFloorFinishId('oak-floor')
      sceneDocumentActions.setWallFinishId('white-wall')
      sceneDocumentActions.setLightingMoodId('warm-white')
    })

    expect(floorFinishId.current).toBe('oak-floor')
    expect(wallFinishId.current).toBe('white-wall')
    expect(lightingMoodId.current).toBe('warm-white')

    act(() => {
      resetSceneDocumentStore()
    })

    expect(lightingMoodId.current).toBe('')
  })

  it('tracks the floor finish loading flag', () => {
    const { result: floorFinishLoading } = renderHook(() =>
      useFloorFinishLoading(),
    )

    expect(floorFinishLoading.current).toBe(false)

    act(() => {
      sceneDocumentActions.setFloorFinishLoading(true)
    })

    expect(floorFinishLoading.current).toBe(true)

    act(() => {
      resetSceneDocumentStore()
    })

    expect(floorFinishLoading.current).toBe(false)
  })

  it('updates selected id directly and clears preview when selection changes', () => {
    act(() => {
      sceneDocumentActions.setPreviewedId('item-1')
      sceneDocumentActions.setSelectedId('item-1')
    })

    expect(useSceneDocumentStore.getState().selectedId).toBe('item-1')
    expect(useSceneDocumentStore.getState().previewedIdRaw).toBeNull()

    act(() => {
      sceneDocumentActions.setPreviewedId('item-2')
      sceneDocumentActions.setSelectedId(null)
    })

    expect(useSceneDocumentStore.getState().selectedId).toBeNull()
    expect(useSceneDocumentStore.getState().previewedIdRaw).toBeNull()
  })

  it('reconciles removed preview ids from the backing scene items', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    act(() => {
      seedSceneItems([FURNITURE_ITEM], { selectedId: FURNITURE_ITEM.id })
      sceneDocumentActions.setPreviewedId(FURNITURE_ITEM.id)
    })

    expect(useSceneDocumentStore.getState().previewedIdRaw).toBe(
      FURNITURE_ITEM.id,
    )

    act(() => {
      seedSceneItems([])
    })

    expect(useSceneDocumentStore.getState().previewedIdRaw).toBeNull()
    expect(consoleErrorSpy).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })

  it('delegates restoreInitialLayout through registered scene services', () => {
    const restoreInitialLayout = vi.fn()
    const instances: FurnitureInstance[] = [
      {
        id: 'furniture-instance-1',
        catalogId: 'chair-1',
        position: [0, 0, 0],
        rotationY: 0,
      },
    ]

    registerDefaultSceneServices({ restoreInitialLayout })

    act(() => {
      sceneCommands.restoreInitialLayout(instances)
    })

    expect(restoreInitialLayout).toHaveBeenCalledWith(instances)
  })

  it('delegates clearSelection through registered scene services', () => {
    const clearSelection = vi.fn()

    registerDefaultSceneServices({ clearSelection })

    act(() => {
      sceneCommands.clearSelection()
    })

    expect(clearSelection).toHaveBeenCalledTimes(1)
  })

  it('delegates deleteSelection through registered scene services', () => {
    const deleteSelection = vi.fn(() => true)

    registerDefaultSceneServices({ deleteSelection })

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

    registerDefaultSceneServices({ undo, redo })

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

    registerDefaultSceneServices({ selectById })

    let result: ReturnType<typeof sceneCommands.selectById> | null = null

    act(() => {
      result = sceneCommands.selectById('item-1')
    })

    expect(result).toEqual({ ok: true, status: 'selected' })
    expect(selectById).toHaveBeenCalledWith('item-1')
  })

  it('delegates addFurniture through registered scene services', () => {
    const addFurniture = vi.fn(() => ({ ok: true as const, id: 'item-1' }))

    registerDefaultSceneServices({ addFurniture })

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

    registerDefaultSceneServices({ moveSelection, setSelectionTransform })

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

    registerDefaultSceneServices({ rotateSelection })

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

    registerDefaultSceneServices({ focusSelected, setCameraPreset })

    act(() => {
      sceneCommands.focusSelected()
      sceneCommands.setCameraPreset('top')
    })

    expect(focusSelected).toHaveBeenCalledTimes(1)
    expect(setCameraPreset).toHaveBeenCalledWith('top')
  })
})
