// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
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
  useFloorFinishId,
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
