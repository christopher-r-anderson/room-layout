// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useEditorLifecycleStore,
  resetEditorLifecycleStore,
} from '../stores/editor-lifecycle-store'
import { resetAssetsStore } from '../stores/assets-store'
import { dialogActions } from '../stores/dialog-store'
import { feedbackActions } from '../stores/feedback-store'
import { selectionEffects } from './selection-effects'
import { runStartupRestoreFlow } from '../persistence/restore-flow'
import { clearCollectionBytes } from './collection-bytes'
import { clearSceneServices } from '@/scene/scene-commands'
import {
  completeAssetLoad,
  notifyAssetError,
  requestAssetRetry,
} from './startup-coordinator'

vi.mock('../persistence/restore-flow', () => ({
  runStartupRestoreFlow: vi.fn(),
  validateDraftState: vi.fn(() => null),
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

vi.mock('../stores/feedback-store', () => ({
  feedbackActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
  },
}))

vi.mock('./collection-bytes', () => ({
  clearCollectionBytes: vi.fn(),
}))

vi.mock('@/scene/scene-commands', () => ({
  clearSceneServices: vi.fn(),
  sceneCommands: {
    restoreInitialLayout: vi.fn(),
  },
}))

vi.mock('@/scene/collection-registry', () => ({
  resetCollectionSceneRegistry: vi.fn(),
}))

vi.mock('@/core/stores/collection-loading-store', () => ({
  resetCollectionLoadingStore: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

beforeEach(() => {
  resetEditorLifecycleStore()
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
    expect(useEditorLifecycleStore.getState().restoreAttemptCount).toBe(1)
    expect(useEditorLifecycleStore.getState().startupPhase).toBe('ready')
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

  it('records the asset error, resets the shell, and announces on asset error', () => {
    const closeActiveDialog = vi.spyOn(dialogActions, 'closeActiveDialog')

    notifyAssetError(new Error('boom'))

    const state = useEditorLifecycleStore.getState()
    expect(state.startupPhase).toBe('errored')
    expect(state.assetError).toEqual({ kind: 'asset-load', message: 'boom' })
    expect(closeActiveDialog).toHaveBeenCalledTimes(1)
    expect(clearSceneServices).toHaveBeenCalledTimes(1)
    expect(feedbackActions.announceAssertive).toHaveBeenCalledWith(
      'Unable to load room editor assets. Retry available.',
    )
  })

  it('clears the buffered assets and bumps the retry token', () => {
    requestAssetRetry()

    expect(clearCollectionBytes).toHaveBeenCalledTimes(1)
    expect(useEditorLifecycleStore.getState().retryToken).toBe(1)
    expect(useEditorLifecycleStore.getState().sceneEpoch).toBe(1)
    expect(feedbackActions.clearAssertiveAnnouncement).toHaveBeenCalledTimes(1)
  })
})
