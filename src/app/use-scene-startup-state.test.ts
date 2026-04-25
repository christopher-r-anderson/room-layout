// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useSceneStartupState } from './use-scene-startup-state'

const catalogMocks = vi.hoisted(() => ({
  preloadFurnitureCollections: vi.fn(),
  clearFurnitureCollectionCache: vi.fn(),
}))

vi.mock('@/scene/objects/furniture-catalog', () => ({
  preloadFurnitureCollections: catalogMocks.preloadFurnitureCollections,
  clearFurnitureCollectionCache: catalogMocks.clearFurnitureCollectionCache,
}))

describe('useSceneStartupState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with the expected initial and derived state', () => {
    const { result } = renderHook(() => useSceneStartupState())

    expect(result.current.assetsReady).toBe(false)
    expect(result.current.assetError).toBeNull()
    expect(result.current.sceneVersion).toBe(0)
    expect(result.current.startupLoadingActive).toBe(true)
    expect(result.current.startupOverlayActive).toBe(true)
    expect(result.current.editorInteractionsEnabled).toBe(false)
  })

  it('preloads furniture collections on mount', () => {
    renderHook(() => useSceneStartupState())

    expect(catalogMocks.preloadFurnitureCollections).toHaveBeenCalledTimes(1)
    expect(catalogMocks.preloadFurnitureCollections).toHaveBeenCalledWith()
  })

  it('handleAssetsReady enables editor interactions and clears errors', () => {
    const { result } = renderHook(() => useSceneStartupState())

    act(() => {
      result.current.handleAssetsReady()
    })

    expect(result.current.assetsReady).toBe(true)
    expect(result.current.assetError).toBeNull()
    expect(result.current.startupLoadingActive).toBe(false)
    expect(result.current.startupOverlayActive).toBe(false)
    expect(result.current.editorInteractionsEnabled).toBe(true)
  })

  it('handleAssetError records error and keeps startup overlay active', () => {
    const { result } = renderHook(() => useSceneStartupState())
    const error = new Error('failed to load assets')

    act(() => {
      result.current.handleAssetError(error)
    })

    expect(result.current.assetsReady).toBe(false)
    expect(result.current.assetError).toBe(error)
    expect(result.current.startupLoadingActive).toBe(false)
    expect(result.current.startupOverlayActive).toBe(true)
    expect(result.current.editorInteractionsEnabled).toBe(false)
  })

  it('supports ready to error transitions', () => {
    const { result } = renderHook(() => useSceneStartupState())
    const error = new Error('renderer crash')

    act(() => {
      result.current.handleAssetsReady()
    })
    expect(result.current.assetsReady).toBe(true)
    expect(result.current.startupOverlayActive).toBe(false)

    act(() => {
      result.current.handleAssetError(error)
    })

    expect(result.current.assetsReady).toBe(false)
    expect(result.current.assetError).toBe(error)
    expect(result.current.startupLoadingActive).toBe(false)
    expect(result.current.startupOverlayActive).toBe(true)
  })

  it('retryAssetLoading clears cache and increments scene version', () => {
    const { result } = renderHook(() => useSceneStartupState())

    act(() => {
      result.current.handleAssetsReady()
      result.current.handleAssetError(new Error('boom'))
    })

    act(() => {
      result.current.retryAssetLoading()
    })

    expect(catalogMocks.clearFurnitureCollectionCache).toHaveBeenCalledTimes(1)
    expect(result.current.assetsReady).toBe(false)
    expect(result.current.assetError).toBeNull()
    expect(result.current.sceneVersion).toBe(1)
    expect(result.current.startupLoadingActive).toBe(true)
    expect(result.current.startupOverlayActive).toBe(true)
  })

  it('keeps refs in sync with state updates after act flushes effects', () => {
    const { result } = renderHook(() => useSceneStartupState())
    const error = new Error('asset failure')

    expect(result.current.assetsReadyRef.current).toBe(false)
    expect(result.current.assetErrorRef.current).toBeNull()

    act(() => {
      result.current.handleAssetsReady()
    })

    expect(result.current.assetsReadyRef.current).toBe(true)
    expect(result.current.assetErrorRef.current).toBeNull()

    act(() => {
      result.current.handleAssetError(error)
    })

    expect(result.current.assetsReadyRef.current).toBe(false)
    expect(result.current.assetErrorRef.current).toBe(error)
  })
})
