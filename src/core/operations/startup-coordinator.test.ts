// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  editorRuntimeStore,
  resetEditorRuntimeStore,
} from '../stores/editor-runtime-store'
import {
  resetAssetsStore,
  assetsActions,
} from '../stores/assets-store'
import { dialogActions } from '../stores/dialog-store'
import { announcementActions } from '../stores/announcement-store'
import { selectionEffects } from './selection-effects'
import { runStartupRestoreFlow } from '../persistence/restore-flow'
import { clearFurnitureCollectionCache } from '@/scene/objects/furniture-catalog'
import { clearSceneServices } from '@/scene/scene-commands'
import {
  completeAssetLoad,
  notifyAssetError,
  requestAssetRetry,
} from './startup-coordinator'

vi.mock('../persistence/restore-flow', () => ({
  runStartupRestoreFlow: vi.fn(),
}))

vi.mock('../persistence/scene-draft', () => ({
  loadSceneDraft: vi.fn().mockReturnValue(null),
  saveSceneDraft: vi.fn(),
}))

vi.mock('./selection-effects', () => ({
  selectionEffects: {
    notePendingSelection: vi.fn(),
  },
}))

vi.mock('../stores/announcement-store', () => ({
  announcementActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
  },
}))

vi.mock('@/scene/objects/furniture-catalog', () => ({
  clearFurnitureCollectionCache: vi.fn(),
}))

vi.mock('@/scene/scene-commands', () => ({
  clearSceneServices: vi.fn(),
  sceneCommands: {
    restoreInitialLayout: vi.fn(),
  },
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

beforeEach(() => {
  resetEditorRuntimeStore()
  resetAssetsStore()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('startup-coordinator', () => {
  it('runs the restore flow exactly once across multiple ready notifications', () => {
    completeAssetLoad()
    completeAssetLoad()

    expect(runStartupRestoreFlow).toHaveBeenCalledTimes(1)
    expect(editorRuntimeStore.getState().restoreAttemptCount).toBe(1)
    expect(editorRuntimeStore.getState().startupPhase).toBe('ready')
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: false,
    })
  })

  it('does not re-run restore after a retry preserves the attempt count', () => {
    completeAssetLoad()
    requestAssetRetry()
    completeAssetLoad()

    expect(runStartupRestoreFlow).toHaveBeenCalledTimes(1)
  })

  it('records the runtime error, resets the shell, and announces on asset error', () => {
    const closeActiveDialog = vi.spyOn(dialogActions, 'closeActiveDialog')

    notifyAssetError(new Error('boom'))

    const state = editorRuntimeStore.getState()
    expect(state.startupPhase).toBe('errored')
    expect(state.assetError).toEqual({ kind: 'asset-load', message: 'boom' })
    expect(closeActiveDialog).toHaveBeenCalledTimes(1)
    expect(clearSceneServices).toHaveBeenCalledTimes(1)
    expect(announcementActions.announceAssertive).toHaveBeenCalledWith(
      'Unable to load room editor assets. Retry available.',
    )
  })

  it('clears the GLTF cache for loaded collections and bumps the retry token', () => {
    assetsActions.setAssets({
      catalog: [],
      collections: [
        { id: 'a', sourcePath: '/models/a.glb' },
        { id: 'b', sourcePath: '/models/b.glb' },
      ],
      environmentConfig: null,
    })

    requestAssetRetry()

    expect(clearFurnitureCollectionCache).toHaveBeenCalledWith([
      '/models/a.glb',
      '/models/b.glb',
    ])
    expect(editorRuntimeStore.getState().retryToken).toBe(1)
    expect(editorRuntimeStore.getState().sceneEpoch).toBe(1)
    expect(
      announcementActions.clearAssertiveAnnouncement,
    ).toHaveBeenCalledTimes(1)
  })
})
