// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  editorLifecycleActions,
  useEditorLifecycleStore,
  resetEditorLifecycleStore,
  useAssetError,
  useEditorInteractionsEnabled,
  useStartupCycle,
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
    expect(state.startupCycle).toBe(0)
  })

  it('starts the asset-load phase without bumping the cycle', () => {
    editorLifecycleActions.markAssetsReady()

    editorLifecycleActions.beginAssetLoad()

    // Only an explicit retry starts a new cycle (and remounts the Scene); the
    // manifest arriving flips the phase back to loading in place.
    const state = useEditorLifecycleStore.getState()
    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
    expect(state.startupCycle).toBe(0)
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
    expect(state.startupCycle).toBe(0)

    editorLifecycleActions.requestRetry()
    editorLifecycleActions.beginAssetLoad()

    state = useEditorLifecycleStore.getState()
    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
  })

  it('bumps the startup cycle on retry and resets restore tracking', () => {
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
    expect(state.startupCycle).toBe(1)
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
    const { result: startupCycle } = renderHook(() => useStartupCycle())

    expect(phase.current).toBe('loading')
    expect(loading.current).toBe(true)
    expect(overlay.current).toBe(true)
    expect(enabled.current).toBe(false)
    expect(assetError.current).toBeNull()
    expect(startupCycle.current).toBe(0)

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

    expect(startupCycle.current).toBe(1)
    expect(phase.current).toBe('loading')
  })
})
