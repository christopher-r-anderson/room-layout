// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { EnvironmentMaterialConfig } from '@/shared/lib/three/environment-materials'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/core/stores/editor-runtime-store'
import {
  resetSceneStateStore,
  sceneStateActions,
} from '@/core/stores/scene-state-store'
import { useDraftPersistence } from './use-draft-persistence'

type SaveSceneDraftArgs = [
  items: ReturnType<typeof createFurnitureItem>[],
  options?: {
    floorFinishId?: string
    wallFinishId?: string
  },
]

const saveSceneDraft = vi.fn<(...args: SaveSceneDraftArgs) => void>()
const clearSceneDraft = vi.fn<() => void>()

vi.mock('@/core/persistence/scene-draft', () => ({
  saveSceneDraft: (...args: SaveSceneDraftArgs) => {
    saveSceneDraft(...args)
  },
  clearSceneDraft: () => {
    clearSceneDraft()
  },
}))

const environmentConfig: EnvironmentMaterialConfig = {
  defaultFloorFinishId: 'floor-default',
  defaultWallFinishId: 'wall-default',
  floorFinishes: [
    {
      id: 'floor-default',
      label: 'Default floor',
      diffusePath: '/floor-default-diffuse.jpg',
      normalPath: '/floor-default-normal.jpg',
      tileSizeMeters: { width: 1, depth: 1 },
    },
    {
      id: 'floor-alt',
      label: 'Alt floor',
      diffusePath: '/floor-alt-diffuse.jpg',
      normalPath: '/floor-alt-normal.jpg',
      tileSizeMeters: { width: 1, depth: 1 },
    },
  ],
  wallFinishes: [
    {
      id: 'wall-default',
      label: 'Default wall',
      color: 0xffffff,
    },
    {
      id: 'wall-alt',
      label: 'Alt wall',
      color: 0xcccccc,
    },
  ],
}

function createFurnitureItem(id: string) {
  return {
    id,
    catalogId: 'catalog-chair',
    name: `Chair ${id}`,
    kind: 'armchair' as const,
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [0, 0, 0] as [number, number, number],
    rotationY: 0,
  }
}

describe('useDraftPersistence', () => {
  beforeEach(() => {
    resetSceneStateStore()
    resetEditorRuntimeStore()
    saveSceneDraft.mockReset()
    clearSceneDraft.mockReset()
  })

  afterEach(() => {
    resetSceneStateStore()
    resetEditorRuntimeStore()
  })

  it('does not persist while startup is still loading', () => {
    renderHook(() => {
      useDraftPersistence({ environmentConfig })
    })

    act(() => {
      sceneStateActions.setHistory(
        createHistoryState([createFurnitureItem('item-1')]),
      )
    })

    expect(saveSceneDraft).not.toHaveBeenCalled()
    expect(clearSceneDraft).not.toHaveBeenCalled()
  })

  it('does not persist while startup is errored', () => {
    renderHook(() => {
      useDraftPersistence({ environmentConfig })
    })

    act(() => {
      editorRuntimeActions.setAssetError({
        kind: 'asset-load',
        message: 'Unable to load asset',
      })
      sceneStateActions.setHistory(
        createHistoryState([createFurnitureItem('item-1')]),
      )
    })

    expect(saveSceneDraft).not.toHaveBeenCalled()
    expect(clearSceneDraft).not.toHaveBeenCalled()

    act(() => {
      sceneStateActions.resetSceneState()
    })

    expect(saveSceneDraft).not.toHaveBeenCalled()
    expect(clearSceneDraft).not.toHaveBeenCalled()
  })

  it('saves draft changes once startup is ready', () => {
    renderHook(() => {
      useDraftPersistence({ environmentConfig })
    })

    act(() => {
      editorRuntimeActions.markAssetsReady()
    })

    expect(clearSceneDraft).toHaveBeenCalledTimes(1)

    saveSceneDraft.mockClear()
    clearSceneDraft.mockClear()

    act(() => {
      sceneStateActions.setHistory(
        createHistoryState([createFurnitureItem('item-1')]),
      )
    })

    expect(saveSceneDraft).toHaveBeenLastCalledWith(
      [createFurnitureItem('item-1')],
      {
        floorFinishId: 'floor-default',
        wallFinishId: 'wall-default',
      },
    )
    expect(clearSceneDraft).not.toHaveBeenCalled()
  })

  it('skips persistence during drag and saves after drag ends', () => {
    renderHook(() => {
      useDraftPersistence({ environmentConfig })
    })

    act(() => {
      editorRuntimeActions.markAssetsReady()
    })

    expect(clearSceneDraft).toHaveBeenCalledTimes(1)

    saveSceneDraft.mockClear()
    clearSceneDraft.mockClear()

    act(() => {
      sceneStateActions.setDragging(true)
      sceneStateActions.setHistory(
        createHistoryState([createFurnitureItem('item-1')]),
      )
    })

    expect(saveSceneDraft).not.toHaveBeenCalled()
    expect(clearSceneDraft).not.toHaveBeenCalled()

    act(() => {
      sceneStateActions.setDragging(false)
    })

    expect(saveSceneDraft).toHaveBeenLastCalledWith(
      [createFurnitureItem('item-1')],
      {
        floorFinishId: 'floor-default',
        wallFinishId: 'wall-default',
      },
    )
  })

  it('clears the draft when the scene returns to defaults', () => {
    renderHook(() => {
      useDraftPersistence({ environmentConfig })
    })

    act(() => {
      editorRuntimeActions.markAssetsReady()
    })

    expect(clearSceneDraft).toHaveBeenCalled()

    act(() => {
      sceneStateActions.setFloorFinishId('floor-alt')
    })

    expect(saveSceneDraft).toHaveBeenLastCalledWith([], {
      floorFinishId: 'floor-alt',
      wallFinishId: 'wall-default',
    })

    act(() => {
      sceneStateActions.setFloorFinishId('floor-default')
    })

    expect(clearSceneDraft).toHaveBeenCalledTimes(2)
  })
})
