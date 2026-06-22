import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type RefObject,
} from 'react'
import { type EnvironmentMaterialConfig } from '@/shared/lib/three/environment-materials'
import {
  clearFurnitureCollectionCache,
  preloadFurnitureCollections,
  type FurnitureCatalogEntry,
  type FurnitureCollection,
} from '@/scene/objects/furniture-catalog'
import { editorRuntimeActions } from '@/editor-state/editor-runtime-store'
import { sceneAssetsActions } from '@/editor-state/scene-assets-store'
import type { StartupErrorKind } from '@/editor-state/types/startup.types'
import {
  fetchCatalogManifest,
  ManifestNetworkError,
  ManifestValidationError,
} from './catalog-manifest'
import { createDevPerfLogger } from './perf-log'

const perfLog = createDevPerfLogger('🚀')

type StartupPhase = 'loading-manifest' | 'loading-assets' | 'ready' | 'error'

interface ReducerState {
  phase: StartupPhase
  manifestCatalog: FurnitureCatalogEntry[] | null
  manifestCollections: FurnitureCollection[] | null
  manifestEnvironment: EnvironmentMaterialConfig | null
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
      environment: EnvironmentMaterialConfig
    }
  | { type: 'MANIFEST_FAILED'; error: Error; kind: StartupErrorKind }
  | { type: 'ASSETS_READY' }
  | { type: 'ASSET_ERROR'; error: Error }
  | { type: 'RETRY' }

const INITIAL_STATE: ReducerState = {
  phase: 'loading-manifest',
  manifestCatalog: null,
  manifestCollections: null,
  manifestEnvironment: null,
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
        manifestEnvironment: action.environment,
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
        manifestEnvironment: null,
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
        manifestEnvironment: null,
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
  assetErrorKind: StartupErrorKind | null
  assetErrorRef: RefObject<Error | null>
  assetsReady: boolean
  assetsReadyRef: RefObject<boolean>
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  environmentConfig: EnvironmentMaterialConfig | null
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

  const catalog = state.manifestCatalog ?? EMPTY_CATALOG
  const collections = state.manifestCollections ?? EMPTY_COLLECTIONS
  const environmentConfig = state.manifestEnvironment
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

  // Mirror startup phase into the editor runtime store so app-side consumers
  // can read it through narrow store hooks instead of through this hook's
  // return value.
  useEffect(() => {
    if (assetError && assetErrorKind) {
      editorRuntimeActions.setAssetError({
        kind: assetErrorKind,
        message: assetError.message,
      })
      return
    }

    if (assetsReady) {
      editorRuntimeActions.markAssetsReady()
      return
    }

    editorRuntimeActions.markLoading()
  }, [assetError, assetErrorKind, assetsReady])

  // Mirror the loaded manifest into the scene-assets store so features can read
  // catalog/collections/finishes through narrow hooks instead of threaded props.
  useEffect(() => {
    sceneAssetsActions.setSceneAssets({
      catalog,
      collections,
      environmentConfig,
    })
  }, [catalog, collections, environmentConfig])

  // Fetch the runtime catalog manifest and preload the resolved collections.
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
          environment: result.environment,
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
    editorRuntimeActions.resetEditorRuntime()
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
      environmentConfig,
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
      environmentConfig,
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
