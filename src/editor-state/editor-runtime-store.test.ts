// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  editorRuntimeActions,
  editorRuntimeStore,
  resetEditorRuntimeStore,
  useAssetError,
  useEditorInteractionsEnabled,
  useFloorFinishLoading,
  useRestoreAttemptCount,
  useRestoreOutcome,
  useStartupLoadingActive,
  useStartupOverlayActive,
  useStartupPhase,
} from './editor-runtime-store'

beforeEach(() => {
  resetEditorRuntimeStore()
})

describe('editorRuntimeStore', () => {
  it('starts in loading mode with no asset error and no restore metadata', () => {
    const state = editorRuntimeStore.getState()

    expect(state.startupPhase).toBe('loading')
    expect(state.assetError).toBeNull()
    expect(state.restoreOutcome).toBeNull()
    expect(state.restoreAttemptCount).toBe(0)
    expect(state.floorFinishLoading).toBe(false)
  })

  it('transitions between loading, ready, and errored phases', () => {
    editorRuntimeActions.markAssetsReady()
    expect(editorRuntimeStore.getState().startupPhase).toBe('ready')
    expect(editorRuntimeStore.getState().assetError).toBeNull()

    editorRuntimeActions.setAssetError({
      kind: 'asset-load',
      message: 'asset load failed',
    })
    expect(editorRuntimeStore.getState().startupPhase).toBe('errored')
    expect(editorRuntimeStore.getState().assetError).toEqual({
      kind: 'asset-load',
      message: 'asset load failed',
    })

    editorRuntimeActions.resetEditorRuntime()
    expect(editorRuntimeStore.getState().startupPhase).toBe('loading')
    expect(editorRuntimeStore.getState().assetError).toBeNull()
  })

  it('records restore outcome and attempt count independently from startup retries', () => {
    editorRuntimeActions.incrementRestoreAttempt()
    editorRuntimeActions.recordRestoreOutcome('restored')
    editorRuntimeActions.setFloorFinishLoading(true)
    editorRuntimeActions.setAssetError({
      kind: 'asset-load',
      message: 'asset load failed',
    })
    editorRuntimeActions.resetEditorRuntime()

    expect(editorRuntimeStore.getState().restoreAttemptCount).toBe(1)
    expect(editorRuntimeStore.getState().restoreOutcome).toBe('restored')
    expect(editorRuntimeStore.getState().startupPhase).toBe('loading')
    expect(editorRuntimeStore.getState().assetError).toBeNull()
    expect(editorRuntimeStore.getState().floorFinishLoading).toBe(false)
  })

  it('exposes derived selectors for startup gating', () => {
    const { result: phase } = renderHook(() => useStartupPhase())
    const { result: loading } = renderHook(() => useStartupLoadingActive())
    const { result: overlay } = renderHook(() => useStartupOverlayActive())
    const { result: enabled } = renderHook(() => useEditorInteractionsEnabled())
    const { result: assetError } = renderHook(() => useAssetError())
    const { result: outcome } = renderHook(() => useRestoreOutcome())
    const { result: attempts } = renderHook(() => useRestoreAttemptCount())
    const { result: floorFinishLoading } = renderHook(() =>
      useFloorFinishLoading(),
    )

    expect(phase.current).toBe('loading')
    expect(loading.current).toBe(true)
    expect(overlay.current).toBe(true)
    expect(enabled.current).toBe(false)
    expect(assetError.current).toBeNull()
    expect(outcome.current).toBeNull()
    expect(attempts.current).toBe(0)
    expect(floorFinishLoading.current).toBe(false)

    act(() => {
      editorRuntimeActions.incrementRestoreAttempt()
      editorRuntimeActions.recordRestoreOutcome('invalid')
      editorRuntimeActions.setFloorFinishLoading(true)
      editorRuntimeActions.markAssetsReady()
    })

    expect(phase.current).toBe('ready')
    expect(loading.current).toBe(false)
    expect(overlay.current).toBe(false)
    expect(enabled.current).toBe(true)
    expect(outcome.current).toBe('invalid')
    expect(attempts.current).toBe(1)
    expect(floorFinishLoading.current).toBe(true)
  })
})
