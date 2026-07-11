// @vitest-environment jsdom

import {
  appToastManager,
  feedback,
  feedbackStoreForTests,
  resetFeedbackStore,
} from '@/core/stores/feedback-store'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  useEditorLifecycleStore,
  resetEditorLifecycleStore,
} from '../stores/editor-lifecycle-store'
import { resetAssetsStore } from '../stores/assets-store'
import { dialogActions } from '../stores/dialog-store'
import {
  focusActions,
  getPendingFocus,
  resetFocusStore,
} from '@/core/stores/focus-store'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
} from '../stores/selection-store'
import {
  resetSceneSessionStore,
  sceneSessionActions,
  useSceneSessionStore,
} from '../stores/scene-session-store'
import { runStartupRestoreFlow } from './restore-flow'
import { runStartupBootstrap } from './startup-bootstrap'
import { resetCollectionPipeline } from './collection-loader'
import { clearSceneServices } from '@/core/scene-services'
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

vi.mock('./collection-loader', () => ({
  resetCollectionPipeline: vi.fn(),
}))

vi.mock('./startup-bootstrap', () => ({
  runStartupBootstrap: vi.fn(),
}))

vi.mock('@/core/scene-services', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/core/scene-services')>()),
  clearSceneServices: vi.fn(),
}))

beforeEach(() => {
  resetEditorLifecycleStore()
  resetAssetsStore()
  resetSelectionStore()
  resetFocusStore()
  resetSceneSessionStore()
  resetFeedbackStore()
})

function seedSceneSessionState() {
  sceneSessionActions.setPreviewedId('item-1')
  sceneSessionActions.setDragging(true)
  sceneSessionActions.setFloorFinishLoading(true)
}

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

  it('records the asset error and resets the shell without raising a toast', () => {
    vi.useFakeTimers()
    const closeActiveDialog = vi.spyOn(dialogActions, 'closeActiveDialog')
    const addToast = vi.spyOn(appToastManager, 'add').mockReturnValue('toast-1')
    const closeToasts = vi.spyOn(appToastManager, 'close')
    seedSceneSessionState()
    feedback.interactionUpdate('Chair selected.')
    feedback.movementUpdate('Chair moved to X 1 and Z 2.')

    notifyAssetError(new Error('boom'))
    vi.runAllTimers()

    const state = useEditorLifecycleStore.getState()
    expect(state.startupPhase).toBe('errored')
    expect(state.assetError).toEqual({ kind: 'asset-load', message: 'boom' })
    expect(closeActiveDialog).toHaveBeenCalledTimes(1)
    expect(clearSceneServices).toHaveBeenCalledTimes(1)
    // The shell reset clears the scene session alongside the document.
    expect(useSceneSessionStore.getState()).toEqual({
      previewedIdRaw: null,
      isDragging: false,
      floorFinishLoading: false,
    })
    // The InitializationError overlay (role=alert) is the only feedback
    // surface for a startup-fatal error: no toast, no announcement - and any
    // pending feedback (open toasts, the movement debounce) is cleared so
    // nothing speaks over the overlay.
    expect(addToast).not.toHaveBeenCalled()
    expect(closeToasts).toHaveBeenCalledTimes(1)
    expect(feedbackStoreForTests.getState().polite.text).toBe('')
    expect(feedbackStoreForTests.getState().assertive.text).toBe('')
    vi.useRealTimers()
  })

  it('resets the collection pipeline, starts a fresh cycle, and re-runs the bootstrap', () => {
    selectionActions.setSelection('chair-1')
    focusActions.setPendingFocus({ surface: 'scene' })
    feedback.interactionUpdate('Chair selected.')
    feedback.formError('Stale error')

    requestAssetRetry()

    // The shell reset drops any stale selection session alongside the scene.
    expect(useSelectionStore.getState().selectedId).toBeNull()
    // A queued focus directive describes the pre-reset world; it must not
    // survive to be realized after the retry.
    expect(getPendingFocus()).toBeNull()
    expect(resetCollectionPipeline).toHaveBeenCalledTimes(1)
    expect(useEditorLifecycleStore.getState().startupCycle).toBe(1)
    expect(runStartupBootstrap).toHaveBeenCalledTimes(1)
    // The retry clears stale announcements alongside the shell.
    expect(feedbackStoreForTests.getState().polite.text).toBe('')
    expect(feedbackStoreForTests.getState().assertive.text).toBe('')
  })

  it('clears the scene session on retry', () => {
    seedSceneSessionState()

    requestAssetRetry()

    expect(useSceneSessionStore.getState()).toEqual({
      previewedIdRaw: null,
      isDragging: false,
      floorFinishLoading: false,
    })
  })
})
