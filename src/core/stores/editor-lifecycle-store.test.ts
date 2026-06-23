// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  editorLifecycleActions,
  editorLifecycleStore,
  resetEditorLifecycleStore,
  useAssetError,
  useEditorInteractionsEnabled,
  useRestoreAttemptCount,
  useRestoreOutcome,
  useRetryToken,
  useSceneEpoch,
  useStartupLoadingActive,
  useStartupOverlayActive,
  useStartupPhase,
} from './editor-lifecycle-store'

beforeEach(() => {
  resetEditorLifecycleStore()
})

describe('editorLifecycleStore', () => {
  it('starts in loading mode with no asset error and no restore metadata', () => {
    const state = editorLifecycleStore.getState()

    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
    expect(state.restoreOutcome).toBeNull()
    expect(state.restoreAttemptCount).toBe(0)
    expect(state.sceneEpoch).toBe(0)
    expect(state.retryToken).toBe(0)
  })

  it('bumps the scene epoch and clears errors when a manifest begins loading assets', () => {
    editorLifecycleActions.setAssetError({
      kind: 'manifest-network',
      message: 'offline',
    })

    editorLifecycleActions.beginAssetLoad()

    const state = editorLifecycleStore.getState()
    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
    expect(state.sceneEpoch).toBe(1)
    expect(state.retryToken).toBe(0)
  })

  it('bumps both epoch and retry token on retry while preserving restore tracking', () => {
    editorLifecycleActions.incrementRestoreAttempt()
    editorLifecycleActions.recordRestoreOutcome('restored')
    editorLifecycleActions.setAssetError({
      kind: 'asset-load',
      message: 'asset load failed',
    })

    editorLifecycleActions.requestRetry()

    const state = editorLifecycleStore.getState()
    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
    expect(state.sceneEpoch).toBe(1)
    expect(state.retryToken).toBe(1)
    // Restore tracking is preserved so the one-time restore flow does not re-run.
    expect(state.restoreAttemptCount).toBe(1)
    expect(state.restoreOutcome).toBe('restored')
  })

  it('transitions between loading, ready, and errored phases', () => {
    editorLifecycleActions.markAssetsReady()
    expect(editorLifecycleStore.getState().startupPhase).toBe('ready')
    expect(editorLifecycleStore.getState().assetError).toBeNull()

    editorLifecycleActions.setAssetError({
      kind: 'asset-load',
      message: 'asset load failed',
    })
    expect(editorLifecycleStore.getState().startupPhase).toBe('errored')
    expect(editorLifecycleStore.getState().assetError).toEqual({
      kind: 'asset-load',
      message: 'asset load failed',
    })

    editorLifecycleActions.requestRetry()
    expect(editorLifecycleStore.getState().startupPhase).toBe('loading')
    expect(editorLifecycleStore.getState().assetError).toBeNull()
  })

  it('exposes derived selectors for startup gating', () => {
    const { result: phase } = renderHook(() => useStartupPhase())
    const { result: loading } = renderHook(() => useStartupLoadingActive())
    const { result: overlay } = renderHook(() => useStartupOverlayActive())
    const { result: enabled } = renderHook(() => useEditorInteractionsEnabled())
    const { result: assetError } = renderHook(() => useAssetError())
    const { result: outcome } = renderHook(() => useRestoreOutcome())
    const { result: attempts } = renderHook(() => useRestoreAttemptCount())
    const { result: sceneEpoch } = renderHook(() => useSceneEpoch())
    const { result: retryToken } = renderHook(() => useRetryToken())

    expect(phase.current).toBe('loading')
    expect(loading.current).toBe(true)
    expect(overlay.current).toBe(true)
    expect(enabled.current).toBe(false)
    expect(assetError.current).toBeNull()
    expect(outcome.current).toBeNull()
    expect(attempts.current).toBe(0)
    expect(sceneEpoch.current).toBe(0)
    expect(retryToken.current).toBe(0)

    act(() => {
      editorLifecycleActions.incrementRestoreAttempt()
      editorLifecycleActions.recordRestoreOutcome('invalid')
      editorLifecycleActions.markAssetsReady()
    })

    expect(phase.current).toBe('ready')
    expect(loading.current).toBe(false)
    expect(overlay.current).toBe(false)
    expect(enabled.current).toBe(true)
    expect(outcome.current).toBe('invalid')
    expect(attempts.current).toBe(1)

    act(() => {
      editorLifecycleActions.requestRetry()
    })

    expect(sceneEpoch.current).toBe(1)
    expect(retryToken.current).toBe(1)
    expect(phase.current).toBe('loading')
  })
})
