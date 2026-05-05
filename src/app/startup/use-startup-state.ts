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
  FURNITURE_CATALOG,
  FURNITURE_COLLECTIONS,
  type FurnitureCatalogEntry,
  type FurnitureCollection,
} from '@/scene/objects/furniture-catalog'
import { fetchCatalogManifest } from './catalog-manifest'

// Simple perf logger for dev mode instrumentation
const perfLog = (message: string, data?: unknown) => {
  if (import.meta.env.DEV) {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[${timestamp}] 🚀 ${message}`, data ?? '')
  }
}

type StartupPhase = 'loading-manifest' | 'loading-assets' | 'ready' | 'error'

interface ReducerState {
  phase: StartupPhase
  manifestCatalog: FurnitureCatalogEntry[] | null
  manifestCollections: FurnitureCollection[] | null
  assetError: Error | null
  cacheInvalidationKey: number
}

type Action =
  | {
      type: 'MANIFEST_LOADED'
      catalog: FurnitureCatalogEntry[]
      collections: FurnitureCollection[]
    }
  | { type: 'MANIFEST_FAILED' }
  | { type: 'ASSETS_READY' }
  | { type: 'ASSET_ERROR'; error: Error }
  | { type: 'RETRY' }
  | {
      type: 'CATALOG_SWITCH'
      catalog: FurnitureCatalogEntry[]
      collections: FurnitureCollection[]
    }

const INITIAL_STATE: ReducerState = {
  phase: 'loading-manifest',
  manifestCatalog: null,
  manifestCollections: null,
  assetError: null,
  cacheInvalidationKey: 0,
}

function reducer(state: ReducerState, action: Action): ReducerState {
  switch (action.type) {
    case 'MANIFEST_LOADED':
      perfLog('Manifest loaded, starting asset preload', {
        collections: action.collections.length,
        catalog: action.catalog.length,
      })
      return {
        ...state,
        phase: 'loading-assets',
        manifestCatalog: action.catalog,
        manifestCollections: action.collections,
      }
    case 'MANIFEST_FAILED':
      perfLog('Manifest load failed, using fallback catalog')
      return {
        ...state,
        phase: 'loading-assets',
      }
    case 'ASSETS_READY':
      perfLog('All assets ready')
      return {
        ...state,
        phase: 'ready',
        assetError: null,
      }
    case 'ASSET_ERROR':
      perfLog('Asset error occurred', { message: action.error.message })
      return {
        ...state,
        phase: 'error',
        assetError: action.error,
      }
    case 'RETRY':
      perfLog('Retrying asset loading')
      return {
        ...state,
        phase: 'loading-assets',
        assetError: null,
        cacheInvalidationKey: state.cacheInvalidationKey + 1,
      }
    case 'CATALOG_SWITCH':
      perfLog('Switching catalog', {
        collections: action.collections.length,
        catalog: action.catalog.length,
      })
      return {
        ...state,
        phase: 'loading-assets',
        manifestCatalog: action.catalog,
        manifestCollections: action.collections,
        assetError: null,
        cacheInvalidationKey: state.cacheInvalidationKey + 1,
      }
  }
}

interface StartupState {
  assetError: Error | null
  assetErrorRef: RefObject<Error | null>
  assetsReady: boolean
  assetsReadyRef: RefObject<boolean>
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

  // Non-null selectors: fall back to static arrays until manifest loads
  const catalog = state.manifestCatalog ?? FURNITURE_CATALOG
  const collections = state.manifestCollections ?? FURNITURE_COLLECTIONS

  const assetsReady = state.phase === 'ready'
  const assetError = state.phase === 'error' ? state.assetError : null

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

  // On mount: fetch the runtime catalog manifest, then preload the resolved collections.
  // Manifest failures are non-fatal — the app falls back to the static FURNITURE_CATALOG.
  useEffect(() => {
    let cancelled = false

    async function run() {
      let resolvedCollections: FurnitureCollection[]

      try {
        const result = await fetchCatalogManifest()

        if (cancelled) return

        dispatch({
          type: 'MANIFEST_LOADED',
          catalog: result.catalog,
          collections: result.collections,
        })

        resolvedCollections = result.collections
      } catch {
        if (cancelled) return

        dispatch({ type: 'MANIFEST_FAILED' })
        resolvedCollections = FURNITURE_COLLECTIONS
      }

      preloadFurnitureCollections(resolvedCollections.map((c) => c.sourcePath))
      perfLog('Asset preload started', {
        collections: resolvedCollections.length,
      })
    }

    void run()

    return () => {
      cancelled = true
    }
  }, [])

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [state, handleAssetError, handleAssetsReady, retryAssetLoading],
  )
}
