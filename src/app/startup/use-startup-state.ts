import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type RefObject,
} from 'react'
import {
  clearFurnitureCollectionCache,
  preloadFurnitureCollections,
  type FurnitureCatalogEntry,
  type FurnitureCollection,
} from '@/scene/objects/furniture-catalog'
import {
  fetchCatalogManifest,
  ManifestNetworkError,
  ManifestValidationError,
} from './catalog-manifest'
import { createDevPerfLogger } from './perf-log'

const perfLog = createDevPerfLogger('🚀')

type StartupPhase = 'loading-manifest' | 'loading-assets' | 'ready' | 'error'
export type StartupErrorKind =
  | 'manifest-timeout'
  | 'manifest-network'
  | 'manifest-validation'
  | 'asset-load'

interface ReducerState {
  phase: StartupPhase
  manifestCatalog: FurnitureCatalogEntry[] | null
  manifestCollections: FurnitureCollection[] | null
  assetError: Error | null
  cacheInvalidationKey: number
  retryKey: number
  assetErrorKind: StartupErrorKind | null
}

type Action =
  | {
      type: 'MANIFEST_LOADED'
      catalog: FurnitureCatalogEntry[]
      collections: FurnitureCollection[]
    }
  | { type: 'MANIFEST_FAILED'; error: Error; kind: StartupErrorKind }
  | { type: 'ASSETS_READY' }
  | { type: 'ASSET_ERROR'; error: Error }
  | { type: 'RETRY' }

const INITIAL_STATE: ReducerState = {
  phase: 'loading-manifest',
  manifestCatalog: null,
  manifestCollections: null,
  assetError: null,
  assetErrorKind: null,
  cacheInvalidationKey: 0,
  retryKey: 0,
}

const EMPTY_CATALOG: FurnitureCatalogEntry[] = []
const EMPTY_COLLECTIONS: FurnitureCollection[] = []

function classifyManifestError(
  error: unknown,
  options: { timedOut: boolean },
): {
  error: Error
  kind: StartupErrorKind
} {
  if (options.timedOut) {
    return {
      error: new Error(
        'Loading the furniture catalog timed out. Check your connection and retry.',
      ),
      kind: 'manifest-timeout',
    }
  }

  if (error instanceof ManifestValidationError) {
    return {
      error: new Error(
        'The furniture catalog data is invalid. Verify the manifest and retry.',
      ),
      kind: 'manifest-validation',
    }
  }

  if (error instanceof ManifestNetworkError) {
    return {
      error: new Error(
        'Unable to reach the furniture catalog. Check your connection and retry.',
      ),
      kind: 'manifest-network',
    }
  }

  return {
    error: new Error(
      'Failed to load the furniture catalog. Check your connection and retry.',
    ),
    kind: 'manifest-network',
  }
}

function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case 'MANIFEST_LOADED': {
      perfLog('Manifest loaded, starting asset preload', {
        collections: action.collections.length,
        catalog: action.catalog.length,
      })
      // Always treat manifest arrival as a new asset-load cycle to ensure Scene remounts
      // and loads new GLTFs. Bump cacheInvalidationKey to force Scene remount.
      return {
        ...state,
        phase: 'loading-assets',
        manifestCatalog: action.catalog,
        manifestCollections: action.collections,
        assetError: null,
        assetErrorKind: null,
        cacheInvalidationKey: state.cacheInvalidationKey + 1,
      }
    }
    case 'MANIFEST_FAILED':
      return {
        ...state,
        phase: 'error',
        manifestCatalog: null,
        manifestCollections: null,
        assetError: action.error,
        assetErrorKind: action.kind,
      }
    case 'ASSETS_READY':
      return {
        ...state,
        phase: 'ready',
        assetError: null,
        assetErrorKind: null,
      }
    case 'ASSET_ERROR':
      perfLog('Asset error occurred', { message: action.error.message })
      return {
        ...state,
        phase: 'error',
        assetError: action.error,
        assetErrorKind: 'asset-load',
      }
    case 'RETRY':
      return {
        ...state,
        phase: 'loading-manifest',
        manifestCatalog: null,
        manifestCollections: null,
        assetError: null,
        assetErrorKind: null,
        cacheInvalidationKey: state.cacheInvalidationKey + 1,
        retryKey: state.retryKey + 1,
      }
    default:
      return state
  }
}

interface StartupState {
  assetError: Error | null
  assetErrorRef: RefObject<Error | null>
  assetsReady: boolean
  assetsReadyRef: RefObject<boolean>
  assetErrorKind: StartupErrorKind | null
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  editorInteractionsEnabled: boolean
  handleAssetError: (error: Error) => void
  handleAssetsReady: () => void
  retryAssetLoading: () => void
  cacheInvalidationKey: number
  startupLoadingActive: boolean
  startupOverlayActive: boolean
}

export function useStartupState(): StartupState {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE)

  // Non-null selectors: empty until manifest loads — the manifest is the only catalog source
  const catalog = state.manifestCatalog ?? EMPTY_CATALOG
  const collections = state.manifestCollections ?? EMPTY_COLLECTIONS
  const { retryKey } = state

  const assetsReady = state.phase === 'ready'
  const assetError = state.phase === 'error' ? state.assetError : null
  const assetErrorKind = state.phase === 'error' ? state.assetErrorKind : null

  const editorInteractionsEnabled = state.phase === 'ready'
  const startupLoadingActive =
    state.phase === 'loading-manifest' || state.phase === 'loading-assets'
  const startupOverlayActive = startupLoadingActive || state.phase === 'error'

  const assetsReadyRef = useRef(assetsReady)
  const assetErrorRef = useRef(assetError)

  useEffect(() => {
    assetsReadyRef.current = assetsReady
  }, [assetsReady])

  useEffect(() => {
    assetErrorRef.current = assetError
  }, [assetError])

  // Fetch the runtime catalog manifest and preload the resolved collections.
  // The manifest is the authoritative catalog source — failures are fatal and show an error overlay.
  // Runs on mount and on each retry (retryKey increment).
  useEffect(() => {
    let cancelled = false
    let manifestFetchTimedOut = false
    const timeoutMs = 5000
    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => {
      manifestFetchTimedOut = true
      abortController.abort()
    }, timeoutMs)

    async function run() {
      try {
        const result = await fetchCatalogManifest('catalog-manifest.json', {
          signal: abortController.signal,
        })

        if (cancelled) return

        dispatch({
          type: 'MANIFEST_LOADED',
          catalog: result.catalog,
          collections: result.collections,
        })

        preloadFurnitureCollections(result.collections.map((c) => c.sourcePath))
      } catch (error) {
        if (cancelled) return

        const classifiedError = classifyManifestError(error, {
          timedOut: manifestFetchTimedOut,
        })

        perfLog('Manifest load failed', {
          error: error instanceof Error ? error.message : String(error),
        })

        dispatch({
          type: 'MANIFEST_FAILED',
          error: classifiedError.error,
          kind: classifiedError.kind,
        })
      } finally {
        window.clearTimeout(timeoutId)
      }
    }

    void run()

    return () => {
      cancelled = true
      window.clearTimeout(timeoutId)
      abortController.abort()
    }
  }, [retryKey])

  // Keep the latest collection paths available for retryAssetLoading without
  // forcing callback identity changes from collection updates.
  const collectionsRef = useRef(collections)
  useEffect(() => {
    collectionsRef.current = collections
  }, [collections])

  const handleAssetsReady = useCallback(() => {
    dispatch({ type: 'ASSETS_READY' })
  }, [])

  const handleAssetError = useCallback((error: Error) => {
    dispatch({ type: 'ASSET_ERROR', error })
  }, [])

  const retryAssetLoading = useCallback(() => {
    const paths = collectionsRef.current.map((c) => c.sourcePath)
    perfLog('Clearing asset cache and retrying', { collections: paths.length })
    clearFurnitureCollectionCache(paths)
    dispatch({ type: 'RETRY' })
  }, [])

  return useMemo(
    () => ({
      assetError,
      assetErrorKind,
      assetErrorRef,
      assetsReady,
      assetsReadyRef,
      catalog,
      collections,
      editorInteractionsEnabled,
      handleAssetError,
      handleAssetsReady,
      retryAssetLoading,
      cacheInvalidationKey: state.cacheInvalidationKey,
      startupLoadingActive,
      startupOverlayActive,
    }),
    [
      assetError,
      assetErrorKind,
      assetErrorRef,
      assetsReady,
      assetsReadyRef,
      catalog,
      collections,
      editorInteractionsEnabled,
      handleAssetError,
      handleAssetsReady,
      retryAssetLoading,
      startupLoadingActive,
      startupOverlayActive,
      state.cacheInvalidationKey,
    ],
  )
}
