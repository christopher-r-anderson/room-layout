// @vitest-environment jsdom

import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, beforeEach, vi } from 'vitest'
import { useStartupState } from './use-startup-state'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/scene/objects/furniture-catalog'

const catalogMocks = vi.hoisted(() => ({
  preloadFurnitureCollections: vi.fn(),
  clearFurnitureCollectionCache: vi.fn(),
}))

vi.mock('@/scene/objects/furniture-catalog', () => ({
  preloadFurnitureCollections: catalogMocks.preloadFurnitureCollections,
  clearFurnitureCollectionCache: catalogMocks.clearFurnitureCollectionCache,
}))

const manifestMocks = vi.hoisted(() => ({
  fetchCatalogManifest: vi.fn(),
  ManifestNetworkError: class ManifestNetworkError extends Error {},
  ManifestValidationError: class ManifestValidationError extends Error {},
}))

vi.mock('./catalog-manifest', () => ({
  fetchCatalogManifest: manifestMocks.fetchCatalogManifest,
  ManifestNetworkError: manifestMocks.ManifestNetworkError,
  ManifestValidationError: manifestMocks.ManifestValidationError,
}))

const MANIFEST_CATALOG: FurnitureCatalogEntry[] = [
  {
    id: 'manifest-1',
    name: 'Manifest Couch',
    kind: 'couch',
    collectionId: 'manifest-col',
    nodeName: 'couch-node',
    footprintSize: { width: 2, depth: 1 },
    previewPath: '/manifest-couch.webp',
  },
]

const MANIFEST_COLLECTIONS: FurnitureCollection[] = [
  { id: 'manifest-col', sourcePath: '/models/manifest.glb' },
]

describe('useStartupState', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts with the expected initial and derived state', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manifestMocks.fetchCatalogManifest.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStartupState())

    expect(result.current.assetsReady).toBe(false)
    expect(result.current.assetError).toBeNull()
    expect(result.current.cacheInvalidationKey).toBe(0)
    expect(result.current.startupLoadingActive).toBe(true)
    expect(result.current.startupOverlayActive).toBe(true)
    expect(result.current.editorInteractionsEnabled).toBe(false)
  })

  it('exposes empty catalog and collections before manifest loads', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manifestMocks.fetchCatalogManifest.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStartupState())

    expect(result.current.catalog).toEqual([])
    expect(result.current.collections).toEqual([])
  })

  it('only preloads manifest collections, no fallback preload', async () => {
    manifestMocks.fetchCatalogManifest.mockResolvedValue({
      catalog: MANIFEST_CATALOG,
      collections: MANIFEST_COLLECTIONS,
    })

    renderHook(() => useStartupState())

    const manifestPaths = MANIFEST_COLLECTIONS.map((c) => c.sourcePath)

    await waitFor(() => {
      expect(catalogMocks.preloadFurnitureCollections).toHaveBeenCalledWith(
        manifestPaths,
      )
    })
    expect(catalogMocks.preloadFurnitureCollections).toHaveBeenCalledTimes(1)
  })

  it('enters error state when manifest fails', async () => {
    manifestMocks.fetchCatalogManifest.mockRejectedValue(
      new Error('network error'),
    )

    const { result } = renderHook(() => useStartupState())

    await waitFor(() => {
      expect(result.current.assetError).not.toBeNull()
    })

    expect(result.current.assetsReady).toBe(false)
    expect(result.current.startupLoadingActive).toBe(false)
    expect(result.current.startupOverlayActive).toBe(true)
    expect(result.current.editorInteractionsEnabled).toBe(false)
  })

  it('exposes manifest catalog after manifest loads', async () => {
    manifestMocks.fetchCatalogManifest.mockResolvedValue({
      catalog: MANIFEST_CATALOG,
      collections: MANIFEST_COLLECTIONS,
    })

    const { result } = renderHook(() => useStartupState())

    await waitFor(() => {
      expect(result.current.catalog).toEqual(MANIFEST_CATALOG)
    })

    expect(result.current.collections).toEqual(MANIFEST_COLLECTIONS)
  })

  it('handleAssetsReady enables editor interactions and clears errors', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manifestMocks.fetchCatalogManifest.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStartupState())

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
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manifestMocks.fetchCatalogManifest.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStartupState())
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
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manifestMocks.fetchCatalogManifest.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStartupState())
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

  it('retryAssetLoading clears cache and re-enters manifest loading', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manifestMocks.fetchCatalogManifest.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStartupState())
    const error = new Error('boom')

    act(() => {
      result.current.handleAssetError(error)
    })

    act(() => {
      result.current.retryAssetLoading()
    })

    expect(catalogMocks.clearFurnitureCollectionCache).toHaveBeenCalledTimes(1)
    expect(result.current.assetsReady).toBe(false)
    expect(result.current.assetError).toBeNull()
    expect(result.current.cacheInvalidationKey).toBe(1)
    expect(result.current.startupLoadingActive).toBe(true)
    expect(result.current.startupOverlayActive).toBe(true)
  })

  it('retryAssetLoading re-fetches the manifest after a manifest failure', async () => {
    manifestMocks.fetchCatalogManifest.mockRejectedValue(
      new Error('network error'),
    )

    const { result } = renderHook(() => useStartupState())

    await waitFor(() => {
      expect(result.current.assetError).not.toBeNull()
    })

    manifestMocks.fetchCatalogManifest.mockResolvedValue({
      catalog: MANIFEST_CATALOG,
      collections: MANIFEST_COLLECTIONS,
    })

    act(() => {
      result.current.retryAssetLoading()
    })

    expect(result.current.assetError).toBeNull()
    expect(result.current.startupLoadingActive).toBe(true)

    await waitFor(() => {
      expect(result.current.catalog).toEqual(MANIFEST_CATALOG)
    })

    expect(manifestMocks.fetchCatalogManifest).toHaveBeenCalledTimes(2)
  })

  it('classifies manifest timeout errors as manifest-timeout', async () => {
    vi.useFakeTimers()

    manifestMocks.fetchCatalogManifest.mockImplementation(
      (_url: string, options?: { signal?: AbortSignal }) => {
        return new Promise((_, reject) => {
          const signal = options?.signal
          if (!signal) {
            reject(new Error('missing signal'))
            return
          }

          signal.addEventListener(
            'abort',
            () => {
              reject(new manifestMocks.ManifestNetworkError('aborted'))
            },
            { once: true },
          )
        })
      },
    )

    const { result } = renderHook(() => useStartupState())

    await act(async () => {
      vi.advanceTimersByTime(5000)
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(result.current.assetErrorKind).toBe('manifest-timeout')

    vi.useRealTimers()
  })

  it('keeps refs in sync with state updates after act flushes effects', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manifestMocks.fetchCatalogManifest.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStartupState())
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
