import { useEffect } from 'react'
import { prefetchFurnitureCollections } from '@/core/operations/furniture-asset-prefetch'
import {
  editorLifecycleActions,
  useRetryToken,
} from '@/core/stores/editor-lifecycle-store'
import { assetsActions } from '@/core/stores/assets-store'
import { startupGateActions } from '@/core/stores/startup-gate-store'
import { resolveReferencedCollectionPaths } from '@/core/persistence/referenced-collections'
import { loadSceneDraft } from '@/core/persistence/scene-draft'
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

        // The gated set is the collections the restored scene (shared link or
        // local draft) references; a fresh/empty scene gates on none and unlocks
        // as soon as the room mounts. Only the gated set is prefetched and drives
        // the loader; the rest of the catalog loads lazily on demand.
        const gatedCollectionPaths = resolveReferencedCollectionPaths({
          href: window.location.href,
          draft: loadSceneDraft(),
          catalog: result.catalog,
          collections: result.collections,
        })
        startupGateActions.setGatedCollectionPaths(gatedCollectionPaths)

        editorLifecycleActions.beginAssetLoad()

        prefetchFurnitureCollections(gatedCollectionPaths)
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
