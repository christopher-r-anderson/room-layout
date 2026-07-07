// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useEditorLifecycleStore,
  resetEditorLifecycleStore,
} from '../stores/editor-lifecycle-store'
import { resetAssetsStore } from '../stores/assets-store'
import { dialogActions } from '../stores/dialog-store'
import { feedbackActions } from '../stores/feedback-store'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
} from '../stores/selection-store'
import { runStartupRestoreFlow } from './restore-flow'
import { resetCollectionPipeline } from './collection-loader'
import { clearSceneServices } from '@/core/scene-commands'
import {
  completeAssetLoad,
  notifyAssetError,
  requestAssetRetry,
} from './startup-coordinator'

vi.mock('./restore-flow', () => ({
  runStartupRestoreFlow: vi.fn(),
  validateDraftState: vi.fn(() => null),
}))

vi.mock('../persistence/scene-draft', () => ({
  loadSceneDraft: vi.fn().mockReturnValue(null),
  saveSceneDraft: vi.fn(),
}))

vi.mock('../stores/feedback-store', () => ({
  feedbackActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
  },
}))

vi.mock('./collection-loader', () => ({
  resetCollectionPipeline: vi.fn(),
}))

vi.mock('@/core/scene-commands', () => ({
  clearSceneServices: vi.fn(),
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
  resetSelectionStore()
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
  })

  it('re-runs the restore flow when a retry completes', () => {
    completeAssetLoad()
    requestAssetRetry()
    completeAssetLoad()

    // The error path wiped the document, so the retry cycle must restore the
    // draft again; skipping it would unlock an empty room and let draft
    // persistence clear the saved draft as an at-defaults scene.
    expect(runStartupRestoreFlow).toHaveBeenCalledTimes(2)
    expect(useEditorLifecycleStore.getState().restoreAttemptCount).toBe(1)
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

  it('resets the collection pipeline and bumps the retry token', () => {
    selectionActions.setSelection('chair-1', 'canvas-pointer')

    requestAssetRetry()

    // The shell reset drops any stale selection session alongside the scene.
    expect(useSelectionStore.getState().selectedId).toBeNull()
    expect(resetCollectionPipeline).toHaveBeenCalledTimes(1)
    expect(useEditorLifecycleStore.getState().retryToken).toBe(1)
    expect(useEditorLifecycleStore.getState().sceneEpoch).toBe(1)
    expect(feedbackActions.clearAssertiveAnnouncement).toHaveBeenCalledTimes(1)
  })
})
