// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import { assetsActions, resetAssetsStore } from '@/core/stores/assets-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  sceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { sceneCommands } from '@/scene/scene-commands'
import { selectionEffects } from '@/core/operations/selection-effects'
import { loadSceneDraft, saveSceneDraft } from '@/core/persistence/scene-draft'
import { CHAIR } from '@/test/support/furniture'
import { resetSceneToDefaults } from './scene-reset'

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
  window.localStorage.clear()

  vi.spyOn(sceneCommands, 'restoreInitialLayout').mockImplementation(
    () => undefined,
  )
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

    expect(sceneDocumentStore.getState().floorFinishId).toBe('oak-floor')
    expect(sceneDocumentStore.getState().wallFinishId).toBe('white-wall')
    expect(sceneDocumentStore.getState().lightingMoodId).toBe('daylight')
  })

  it('falls back to empty finish ids when no environment is loaded', () => {
    sceneDocumentActions.setFloorFinishId('granite-tile')
    sceneDocumentActions.setWallFinishId('sage-green')
    sceneDocumentActions.setLightingMoodId('soft-lamplight')

    resetSceneToDefaults()

    expect(sceneDocumentStore.getState().floorFinishId).toBe('')
    expect(sceneDocumentStore.getState().wallFinishId).toBe('')
    expect(sceneDocumentStore.getState().lightingMoodId).toBe('')
  })

  it('clears the layout and the persisted draft', () => {
    loadEnvironment()
    saveSceneDraft([CHAIR])
    expect(loadSceneDraft()).not.toBeNull()

    resetSceneToDefaults()

    expect(sceneCommands.restoreInitialLayout).toHaveBeenCalledWith([])
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

  it('clears the selection without announcing it', () => {
    loadEnvironment()
    const notePendingSelection = vi.spyOn(
      selectionEffects,
      'notePendingSelection',
    )

    resetSceneToDefaults()

    expect(notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: false,
    })
  })
})
