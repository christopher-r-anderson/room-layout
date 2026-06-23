import { useEffect } from 'react'
import { preloadFurnitureCollections } from '@/scene/objects/furniture-catalog'
import {
  editorLifecycleActions,
  useRetryToken,
} from '@/core/stores/editor-lifecycle-store'
import { assetsActions } from '@/core/stores/assets-store'
import type { StartupErrorKind } from '@/core/types/startup.types'
import {
  fetchCatalogManifest,
  ManifestNetworkError,
  ManifestValidationError,
} from './catalog-manifest'
import { createDevPerfLogger } from './perf-log'

const perfLog = createDevPerfLogger('🚀')

const MANIFEST_TIMEOUT_MS = 5000

function classifyManifestError(
  error: unknown,
  options: { timedOut: boolean },
): { error: Error; kind: StartupErrorKind } {
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

// Bootstraps the editor: fetches the catalog manifest, mirrors it into the
// scene-assets store, and drives the runtime store's startup phase. The fetch
// re-runs whenever the runtime store's retry token changes (the retry path),
// and the editor-lifecycle-store is the single owner of the startup phase — this
// hook only performs the React-coupled fetch lifecycle.
export function useStartupBootstrap() {
  const retryToken = useRetryToken()

  useEffect(() => {
    let cancelled = false
    let manifestFetchTimedOut = false
    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => {
      manifestFetchTimedOut = true
      abortController.abort()
    }, MANIFEST_TIMEOUT_MS)

    async function run() {
      try {
        const result = await fetchCatalogManifest('catalog-manifest.json', {
          signal: abortController.signal,
        })

        if (cancelled) return

        perfLog('Manifest loaded, starting asset preload', {
          collections: result.collections.length,
          catalog: result.catalog.length,
        })

        assetsActions.setAssets({
          catalog: result.catalog,
          collections: result.collections,
          environmentConfig: result.environment,
        })
        editorLifecycleActions.beginAssetLoad()

        preloadFurnitureCollections(result.collections.map((c) => c.sourcePath))
      } catch (error) {
        if (cancelled) return

        const classified = classifyManifestError(error, {
          timedOut: manifestFetchTimedOut,
        })

        perfLog('Manifest load failed', {
          error: error instanceof Error ? error.message : String(error),
        })

        editorLifecycleActions.setAssetError({
          kind: classified.kind,
          message: classified.error.message,
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
  }, [retryToken])
}
