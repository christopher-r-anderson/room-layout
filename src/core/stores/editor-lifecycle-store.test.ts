// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  editorLifecycleActions,
  useEditorLifecycleStore,
  resetEditorLifecycleStore,
  useAssetError,
  useEditorInteractionsEnabled,
  useRetryToken,
  useSceneEpoch,
  useStartupLoadingActive,
  useStartupOverlayActive,
  useStartupPhase,
} from './editor-lifecycle-store'

beforeEach(() => {
  resetEditorLifecycleStore()
})

describe('useEditorLifecycleStore', () => {
  it('starts in loading mode with no asset error and no restore metadata', () => {
    const state = useEditorLifecycleStore.getState()

    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
    expect(state.restoreOutcome).toBeNull()
    expect(state.restoreAttemptCount).toBe(0)
    expect(state.sceneEpoch).toBe(0)
    expect(state.retryToken).toBe(0)
  })

  it('bumps the scene epoch when a manifest begins loading assets', () => {
    editorLifecycleActions.beginAssetLoad()

    const state = useEditorLifecycleStore.getState()
    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
    expect(state.sceneEpoch).toBe(1)
    expect(state.retryToken).toBe(0)
  })

  it('keeps an errored phase sticky against a late manifest success until retry', () => {
    // A failure (e.g. a failed engine chunk fetch) can land while the manifest
    // fetch is still in flight; its success must not clear the error and
    // strand the loader - only an explicit retry leaves 'errored'.
    editorLifecycleActions.setAssetError({
      kind: 'asset-load',
      message: 'chunk failed',
    })

    editorLifecycleActions.beginAssetLoad()

    let state = useEditorLifecycleStore.getState()
    expect(state.startupPhase).toBe('errored')
    expect(state.assetError).not.toBeNull()
    expect(state.sceneEpoch).toBe(0)

    editorLifecycleActions.requestRetry()
    editorLifecycleActions.beginAssetLoad()

    state = useEditorLifecycleStore.getState()
    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
  })

  it('bumps both epoch and retry token on retry and resets restore tracking', () => {
    editorLifecycleActions.incrementRestoreAttempt()
    editorLifecycleActions.recordRestoreOutcome('restored')
    editorLifecycleActions.setAssetError({
      kind: 'asset-load',
      message: 'asset load failed',
    })

    editorLifecycleActions.requestRetry()

    const state = useEditorLifecycleStore.getState()
    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
    expect(state.sceneEpoch).toBe(1)
    expect(state.retryToken).toBe(1)
    // The retry cycle must restore again: the error path wiped the document.
    expect(state.restoreAttemptCount).toBe(0)
    expect(state.restoreOutcome).toBeNull()
  })

  it('transitions between loading, ready, and errored phases', () => {
    editorLifecycleActions.markAssetsReady()
    expect(useEditorLifecycleStore.getState().startupPhase).toBe('ready')
    expect(useEditorLifecycleStore.getState().assetError).toBeNull()

    editorLifecycleActions.setAssetError({
      kind: 'asset-load',
      message: 'asset load failed',
    })
    expect(useEditorLifecycleStore.getState().startupPhase).toBe('errored')
    expect(useEditorLifecycleStore.getState().assetError).toEqual({
      kind: 'asset-load',
      message: 'asset load failed',
    })

    editorLifecycleActions.requestRetry()
    expect(useEditorLifecycleStore.getState().startupPhase).toBe('loading')
    expect(useEditorLifecycleStore.getState().assetError).toBeNull()
  })

  it('exposes derived selectors for startup gating', () => {
    const { result: phase } = renderHook(() => useStartupPhase())
    const { result: loading } = renderHook(() => useStartupLoadingActive())
    const { result: overlay } = renderHook(() => useStartupOverlayActive())
    const { result: enabled } = renderHook(() => useEditorInteractionsEnabled())
    const { result: assetError } = renderHook(() => useAssetError())
    const { result: sceneEpoch } = renderHook(() => useSceneEpoch())
    const { result: retryToken } = renderHook(() => useRetryToken())

    expect(phase.current).toBe('loading')
    expect(loading.current).toBe(true)
    expect(overlay.current).toBe(true)
    expect(enabled.current).toBe(false)
    expect(assetError.current).toBeNull()
    expect(sceneEpoch.current).toBe(0)
    expect(retryToken.current).toBe(0)

    act(() => {
      editorLifecycleActions.markAssetsReady()
    })

    expect(phase.current).toBe('ready')
    expect(loading.current).toBe(false)
    expect(overlay.current).toBe(false)
    expect(enabled.current).toBe(true)

    act(() => {
      editorLifecycleActions.requestRetry()
    })

    expect(sceneEpoch.current).toBe(1)
    expect(retryToken.current).toBe(1)
    expect(phase.current).toBe('loading')
  })
})
