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
  FURNITURE_CATALOG: [
    {
      id: 'fallback-1',
      name: 'Fallback Item',
      kind: 'couch',
      collectionId: 'fallback-col',
      nodeName: 'node',
      footprintSize: { width: 1, depth: 1 },
      previewPath: '/fallback.webp',
    },
  ] as FurnitureCatalogEntry[],
  FURNITURE_COLLECTIONS: [
    { id: 'fallback-col', sourcePath: '/models/fallback.glb' },
  ] as FurnitureCollection[],
}))

vi.mock('@/scene/objects/furniture-catalog', () => ({
  preloadFurnitureCollections: catalogMocks.preloadFurnitureCollections,
  clearFurnitureCollectionCache: catalogMocks.clearFurnitureCollectionCache,
  FURNITURE_CATALOG: catalogMocks.FURNITURE_CATALOG,
  FURNITURE_COLLECTIONS: catalogMocks.FURNITURE_COLLECTIONS,
}))

const manifestMocks = vi.hoisted(() => ({
  fetchCatalogManifest: vi.fn(),
}))

vi.mock('./catalog-manifest', () => ({
  fetchCatalogManifest: manifestMocks.fetchCatalogManifest,
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

function createDeferred<T>() {
  let resolve!: (value: T | PromiseLike<T>) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

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

  it('exposes the fallback catalog before manifest loads', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manifestMocks.fetchCatalogManifest.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStartupState())

    expect(result.current.catalog).toBe(catalogMocks.FURNITURE_CATALOG)
    expect(result.current.collections).toBe(catalogMocks.FURNITURE_COLLECTIONS)
  })

  it('preloads manifest collections on mount after manifest loads', async () => {
    manifestMocks.fetchCatalogManifest.mockResolvedValue({
      catalog: MANIFEST_CATALOG,
      collections: MANIFEST_COLLECTIONS,
    })

    renderHook(() => useStartupState())

    // First call is fallback collections (immediate), second is manifest collections
    const fallbackPaths = catalogMocks.FURNITURE_COLLECTIONS.map(
      (c) => c.sourcePath,
    )
    const manifestPaths = MANIFEST_COLLECTIONS.map((c) => c.sourcePath)

    await waitFor(() => {
      expect(catalogMocks.preloadFurnitureCollections).toHaveBeenCalledWith(
        fallbackPaths,
      )
      expect(catalogMocks.preloadFurnitureCollections).toHaveBeenCalledWith(
        manifestPaths,
      )
    })
  })

  it('falls back to static catalog and preloads static collections when manifest fails', () => {
    manifestMocks.fetchCatalogManifest.mockRejectedValue(
      new Error('network error'),
    )

    renderHook(() => useStartupState())

    // Fallback preload happens immediately on mount
    const fallbackPaths = catalogMocks.FURNITURE_COLLECTIONS.map(
      (c) => c.sourcePath,
    )
    expect(catalogMocks.preloadFurnitureCollections).toHaveBeenCalledWith(
      fallbackPaths,
    )
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

  it('re-enters loading and increments the scene key when manifest arrives after ready', async () => {
    const deferredManifest = createDeferred<{
      catalog: FurnitureCatalogEntry[]
      collections: FurnitureCollection[]
    }>()
    manifestMocks.fetchCatalogManifest.mockReturnValue(deferredManifest.promise)

    const { result } = renderHook(() => useStartupState())

    act(() => {
      result.current.handleAssetsReady()
    })

    expect(result.current.assetsReady).toBe(true)
    expect(result.current.cacheInvalidationKey).toBe(0)

    await act(async () => {
      deferredManifest.resolve({
        catalog: MANIFEST_CATALOG,
        collections: MANIFEST_COLLECTIONS,
      })
      await deferredManifest.promise
    })

    expect(result.current.assetsReady).toBe(false)
    expect(result.current.editorInteractionsEnabled).toBe(false)
    expect(result.current.startupLoadingActive).toBe(true)
    expect(result.current.cacheInvalidationKey).toBe(1)

    act(() => {
      result.current.handleAssetsReady()
    })

    expect(result.current.assetsReady).toBe(true)
    expect(result.current.editorInteractionsEnabled).toBe(true)
    expect(result.current.startupOverlayActive).toBe(false)
  })

  it('keeps ready state when the manifest fails after fallback assets are already ready', async () => {
    const deferredManifest = createDeferred<{
      catalog: FurnitureCatalogEntry[]
      collections: FurnitureCollection[]
    }>()
    manifestMocks.fetchCatalogManifest.mockReturnValue(deferredManifest.promise)

    const { result } = renderHook(() => useStartupState())

    act(() => {
      result.current.handleAssetsReady()
    })

    expect(result.current.assetsReady).toBe(true)
    expect(result.current.startupOverlayActive).toBe(false)

    await act(async () => {
      deferredManifest.reject(new Error('network error'))
      await Promise.resolve()
    })

    expect(result.current.assetsReady).toBe(true)
    expect(result.current.editorInteractionsEnabled).toBe(true)
    expect(result.current.startupLoadingActive).toBe(false)
    expect(result.current.startupOverlayActive).toBe(false)
    expect(result.current.cacheInvalidationKey).toBe(0)
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

  it('retryAssetLoading clears cache and increments scene version', () => {
    // eslint-disable-next-line @typescript-eslint/no-empty-function
    manifestMocks.fetchCatalogManifest.mockReturnValue(new Promise(() => {}))

    const { result } = renderHook(() => useStartupState())

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
    expect(result.current.cacheInvalidationKey).toBe(1)
    expect(result.current.startupLoadingActive).toBe(true)
    expect(result.current.startupOverlayActive).toBe(true)
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
