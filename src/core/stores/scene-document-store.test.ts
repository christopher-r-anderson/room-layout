// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  commitHistoryPresent,
  createHistoryState,
} from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'
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
  useHistoryAvailability,
  useItems,
  useLightingMoodId,
  useWallFinishId,
} from './scene-document-store'

const FURNITURE_ITEM = makeFurnitureItem({ id: 'item-1', catalogId: 'chair-1' })

beforeEach(() => {
  resetSceneDocumentStore()
  clearSceneServices()
})

function seedSceneItems(items: FurnitureItem[]) {
  sceneDocumentActions.setHistory(createHistoryState(items))
}

function registerDefaultSceneServices(
  overrides: Partial<Parameters<typeof registerSceneServices>[0]> = {},
) {
  registerSceneServices({
    focusSelected: () => undefined,
    getCameraPosition: () => [0, 0, 0],
    loadCollectionScene: () => Promise.resolve(),
    getSnapshot: () => ({
      cameraPosition: [0, 0, 0] as [number, number, number],
      items: [],
    }),
    setCameraKeyState: () => undefined,
    setCameraPreset: () => undefined,
    ...overrides,
  })
}

describe('useSceneDocumentStore', () => {
  it('derives the item list from the history present', () => {
    const { result: items } = renderHook(() => useItems())

    expect(items.current).toEqual([])

    act(() => {
      seedSceneItems([FURNITURE_ITEM])
    })

    expect(items.current).toEqual([FURNITURE_ITEM])
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

  it('reconciles removed preview ids from the backing scene items', () => {
    const consoleErrorSpy = vi
      .spyOn(console, 'error')
      .mockImplementation(() => undefined)

    act(() => {
      seedSceneItems([FURNITURE_ITEM])
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
