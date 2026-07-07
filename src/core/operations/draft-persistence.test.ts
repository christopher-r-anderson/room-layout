import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSceneSessionStore,
  sceneSessionActions,
} from '@/core/stores/scene-session-store'
import { assetsActions, resetAssetsStore } from '@/core/stores/assets-store'
import { startDraftPersistenceReconciler } from './draft-persistence'

type SaveSceneDraftArgs = [
  items: ReturnType<typeof createFurnitureItem>[],
  options?: {
    floorFinishId?: string
    wallFinishId?: string
    lightingMoodId?: string
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
  defaultLightingMoodId: 'lighting-default',
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
  lightingMoods: [
    {
      id: 'lighting-default',
      label: 'Default mood',
      exposure: 1.05,
      ambientIntensity: 0.35,
      hemisphereSkyColor: 0xf1f6ff,
      hemisphereGroundColor: 0xaeb9c9,
      hemisphereIntensity: 0.55,
      keyLightColor: 0xfff4e6,
      keyLightIntensity: 1,
      fillLightColor: 0xd5e4ff,
      fillLightIntensity: 0.28,
      environmentColor: 0xdce6f3,
      environmentIntensity: 0.72,
      backgroundIntensity: 0.95,
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

describe('startDraftPersistenceReconciler', () => {
  let stopReconciler: () => void

  beforeEach(() => {
    resetSceneDocumentStore()
    resetSceneSessionStore()
    resetEditorLifecycleStore()
    resetAssetsStore()
    assetsActions.setAssets({
      catalog: [],
      collections: [],
      environmentConfig,
    })
    saveSceneDraft.mockReset()
    clearSceneDraft.mockReset()
    stopReconciler = startDraftPersistenceReconciler()
  })

  afterEach(() => {
    stopReconciler()
    resetSceneDocumentStore()
    resetSceneSessionStore()
    resetEditorLifecycleStore()
    resetAssetsStore()
  })

  it('does not persist while startup is still loading', () => {
    sceneDocumentActions.setHistory(
      createHistoryState([createFurnitureItem('item-1')]),
    )

    expect(saveSceneDraft).not.toHaveBeenCalled()
    expect(clearSceneDraft).not.toHaveBeenCalled()
  })

  it('does not persist while startup is errored', () => {
    editorLifecycleActions.setAssetError({
      kind: 'asset-load',
      message: 'Unable to load asset',
    })
    sceneDocumentActions.setHistory(
      createHistoryState([createFurnitureItem('item-1')]),
    )

    expect(saveSceneDraft).not.toHaveBeenCalled()
    expect(clearSceneDraft).not.toHaveBeenCalled()

    sceneDocumentActions.reset()

    expect(saveSceneDraft).not.toHaveBeenCalled()
    expect(clearSceneDraft).not.toHaveBeenCalled()
  })

  it('saves draft changes once startup is ready', () => {
    editorLifecycleActions.markAssetsReady()

    expect(clearSceneDraft).toHaveBeenCalledTimes(1)

    saveSceneDraft.mockClear()
    clearSceneDraft.mockClear()

    sceneDocumentActions.setHistory(
      createHistoryState([createFurnitureItem('item-1')]),
    )

    expect(saveSceneDraft).toHaveBeenLastCalledWith(
      [createFurnitureItem('item-1')],
      {
        floorFinishId: 'floor-default',
        wallFinishId: 'wall-default',
        lightingMoodId: 'lighting-default',
      },
    )
    expect(clearSceneDraft).not.toHaveBeenCalled()
  })

  it('skips persistence during drag and saves after drag ends', () => {
    editorLifecycleActions.markAssetsReady()

    expect(clearSceneDraft).toHaveBeenCalledTimes(1)

    saveSceneDraft.mockClear()
    clearSceneDraft.mockClear()

    sceneSessionActions.setDragging(true)
    sceneDocumentActions.setHistory(
      createHistoryState([createFurnitureItem('item-1')]),
    )

    expect(saveSceneDraft).not.toHaveBeenCalled()
    expect(clearSceneDraft).not.toHaveBeenCalled()

    sceneSessionActions.setDragging(false)

    expect(saveSceneDraft).toHaveBeenLastCalledWith(
      [createFurnitureItem('item-1')],
      {
        floorFinishId: 'floor-default',
        wallFinishId: 'wall-default',
        lightingMoodId: 'lighting-default',
      },
    )
  })

  it('clears the draft when the scene returns to defaults', () => {
    editorLifecycleActions.markAssetsReady()

    expect(clearSceneDraft).toHaveBeenCalled()

    sceneDocumentActions.setFloorFinishId('floor-alt')

    expect(saveSceneDraft).toHaveBeenLastCalledWith([], {
      floorFinishId: 'floor-alt',
      wallFinishId: 'wall-default',
      lightingMoodId: 'lighting-default',
    })

    sceneDocumentActions.setFloorFinishId('floor-default')

    expect(clearSceneDraft).toHaveBeenCalledTimes(2)
  })
})
