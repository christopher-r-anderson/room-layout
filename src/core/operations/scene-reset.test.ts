// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import { assetsActions, resetAssetsStore } from '@/core/stores/assets-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { sceneCommands } from '@/core/scene-commands'
import {
  feedbackStoreForTests,
  resetFeedbackStore,
} from '@/core/stores/feedback-store'
import { restoreInitialLayout } from '@/core/operations/history-mutations'
import { loadSceneDraft, saveSceneDraft } from '@/core/persistence/scene-draft'
import { CHAIR } from '@/test/support/furniture'
import { DEFAULT_ROOM_SIZE } from '@/domain/geometry/room-metrics'
import { resetSceneToDefaults } from './scene-reset'

vi.mock('@/core/operations/history-mutations', () => ({
  redo: vi.fn(),
  restoreInitialLayout: vi.fn(),
  undo: vi.fn(),
}))

const ENVIRONMENT: EnvironmentMaterialConfig = {
  defaultFloorFinishId: 'oak-floor',
  defaultWallFinishId: 'white-wall',
  defaultLightingMoodId: 'daylight',
  floorFinishes: [],
  wallFinishes: [],
  lightingMoods: [],
}

function loadEnvironment() {
  assetsActions.setAssets({
    catalog: [],
    collections: [],
    environmentConfig: ENVIRONMENT,
  })
}

beforeEach(() => {
  resetAssetsStore()
  resetSceneDocumentStore()
  resetFeedbackStore()
  window.localStorage.clear()

  vi.spyOn(sceneCommands, 'setCameraPreset').mockImplementation(() => undefined)
  vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
})

afterEach(() => {
  vi.restoreAllMocks()
  resetAssetsStore()
  resetSceneDocumentStore()
  window.localStorage.clear()
})

describe('resetSceneToDefaults', () => {
  it('restores the loaded environment default finishes', () => {
    loadEnvironment()
    sceneDocumentActions.setFloorFinishId('granite-tile')
    sceneDocumentActions.setWallFinishId('sage-green')
    sceneDocumentActions.setLightingMoodId('soft-lamplight')

    resetSceneToDefaults()

    expect(useSceneDocumentStore.getState().floorFinishId).toBe('oak-floor')
    expect(useSceneDocumentStore.getState().wallFinishId).toBe('white-wall')
    expect(useSceneDocumentStore.getState().lightingMoodId).toBe('daylight')
  })

  it('restores the default room size', () => {
    loadEnvironment()
    sceneDocumentActions.setRoomSize({ width: 4, depth: 5, height: 3 })

    resetSceneToDefaults()

    expect(useSceneDocumentStore.getState().roomSize).toEqual(DEFAULT_ROOM_SIZE)
  })

  it('falls back to empty finish ids when no environment is loaded', () => {
    sceneDocumentActions.setFloorFinishId('granite-tile')
    sceneDocumentActions.setWallFinishId('sage-green')
    sceneDocumentActions.setLightingMoodId('soft-lamplight')

    resetSceneToDefaults()

    expect(useSceneDocumentStore.getState().floorFinishId).toBe('')
    expect(useSceneDocumentStore.getState().wallFinishId).toBe('')
    expect(useSceneDocumentStore.getState().lightingMoodId).toBe('')
  })

  it('clears the layout and the persisted draft', () => {
    loadEnvironment()
    saveSceneDraft([CHAIR])
    expect(loadSceneDraft()).not.toBeNull()

    resetSceneToDefaults()

    expect(restoreInitialLayout).toHaveBeenCalledWith([])
    expect(loadSceneDraft()).toBeNull()
  })

  it('recenters the camera when the scene is ready', () => {
    loadEnvironment()
    vi.mocked(sceneCommands.isSceneReady).mockReturnValue(true)

    resetSceneToDefaults()

    expect(sceneCommands.setCameraPreset).toHaveBeenCalledWith('corner')
  })

  it('skips recentering the camera when the scene is not ready', () => {
    loadEnvironment()
    vi.mocked(sceneCommands.isSceneReady).mockReturnValue(false)

    resetSceneToDefaults()

    expect(sceneCommands.setCameraPreset).not.toHaveBeenCalled()
  })

  it('clears the layout silently, without a selection announcement', () => {
    loadEnvironment()

    resetSceneToDefaults()

    // restoreInitialLayout clears the selection pointer itself; the reset must
    // not announce that clear.
    expect(restoreInitialLayout).toHaveBeenCalledWith([])
    expect(feedbackStoreForTests.getState().polite.text).toBe('')
  })
})
