// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import {
  completeAssetLoad,
  notifyAssetError,
} from '@/core/operations/startup-coordinator'
import {
  collectionLoadingActions,
  resetCollectionLoading,
} from '@/core/stores/collection-loading-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
  setSceneMounted,
} from '@/core/stores/editor-lifecycle-store'
import { useStartupReadiness } from './use-startup-readiness'

vi.mock('@/core/operations/startup-coordinator', () => ({
  completeAssetLoad: vi.fn(),
  notifyAssetError: vi.fn(),
}))

beforeEach(() => {
  resetEditorLifecycleStore()
  resetCollectionLoading()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useStartupReadiness', () => {
  it('does not resolve before the scene has mounted', () => {
    renderHook(() => {
      useStartupReadiness()
    })

    act(() => {
      collectionLoadingActions.setGatedCollectionPaths([])
    })

    expect(completeAssetLoad).not.toHaveBeenCalled()
  })

  it('does not resolve while the gated set is unresolved, even with the scene up', () => {
    renderHook(() => {
      useStartupReadiness()
    })

    act(() => {
      setSceneMounted(true)
    })

    expect(completeAssetLoad).not.toHaveBeenCalled()
  })

  it('completes immediately for a fresh scene (gate resolved to empty)', () => {
    renderHook(() => {
      useStartupReadiness()
    })

    act(() => {
      setSceneMounted(true)
      collectionLoadingActions.setGatedCollectionPaths([])
    })

    expect(completeAssetLoad).toHaveBeenCalledTimes(1)
    expect(notifyAssetError).not.toHaveBeenCalled()
  })

  it('completes once every gated collection has loaded, not before', () => {
    renderHook(() => {
      useStartupReadiness()
    })

    act(() => {
      setSceneMounted(true)
      collectionLoadingActions.setGatedCollectionPaths([
        '/models/a.glb',
        '/models/b.glb',
      ])
      collectionLoadingActions.markLoaded('/models/a.glb')
    })
    expect(completeAssetLoad).not.toHaveBeenCalled()

    act(() => {
      collectionLoadingActions.markLoaded('/models/b.glb')
    })
    expect(completeAssetLoad).toHaveBeenCalledTimes(1)
  })

  it('reports a startup error when a gated collection fails', () => {
    renderHook(() => {
      useStartupReadiness()
    })

    act(() => {
      setSceneMounted(true)
      collectionLoadingActions.setGatedCollectionPaths(['/models/a.glb'])
      collectionLoadingActions.markFailed(
        '/models/a.glb',
        new TypeError('Failed to fetch'),
      )
    })

    expect(notifyAssetError).toHaveBeenCalledTimes(1)
    expect(completeAssetLoad).not.toHaveBeenCalled()
  })

  it('stays quiet once the phase has left loading, and re-arms after a retry', () => {
    renderHook(() => {
      useStartupReadiness()
    })

    act(() => {
      setSceneMounted(true)
      collectionLoadingActions.setGatedCollectionPaths([])
    })
    expect(completeAssetLoad).toHaveBeenCalledTimes(1)

    // completeAssetLoad flips the phase off 'loading' in production; simulate
    // that flip and confirm further store changes do not re-fire.
    act(() => {
      editorLifecycleActions.markAssetsReady()
      collectionLoadingActions.markLoaded('/models/on-demand.glb')
    })
    expect(completeAssetLoad).toHaveBeenCalledTimes(1)

    // A retry returns the phase to 'loading' and resets the gate; the observer
    // re-arms once bootstrap re-resolves it.
    act(() => {
      editorLifecycleActions.requestRetry()
      resetCollectionLoading()
    })
    expect(completeAssetLoad).toHaveBeenCalledTimes(1)

    act(() => {
      collectionLoadingActions.setGatedCollectionPaths([])
    })
    expect(completeAssetLoad).toHaveBeenCalledTimes(2)
  })
})
