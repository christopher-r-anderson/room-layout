import {
  editorLifecycleActions,
  type StartupErrorKind,
} from '@/core/stores/editor-lifecycle-store'
import { assetsActions } from '@/core/stores/assets-store'
import { collectionLoadingActions } from '@/core/stores/collection-loading-store'
import { resolveReferencedCollectionPaths } from './referenced-collections'
import { warmCollectionBytes } from './collection-bytes'
import { loadSceneDraft } from '@/core/persistence/scene-draft'
import {
  fetchCatalogManifest,
  ManifestNetworkError,
  ManifestValidationError,
} from './catalog-manifest'
import { createDevPerfLogger } from '@/shared/debug/perf-log'

const perfLog = createDevPerfLogger('🚀')

// Generous rather than tight: the manifest is a small JSON, but a throttled
// connection needs headroom for connection setup before the timeout fires.
const MANIFEST_TIMEOUT_MS = 15000

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

let activeRun: AbortController | null = null

/**
 * Invoked explicitly - at app mount and by requestAssetRetry - rather than
 * keyed on store state. Latest wins: a new run aborts the one in flight, and
 * a superseded or cancelled run writes nothing (only a timeout abort surfaces
 * as an error).
 */
export function runStartupBootstrap(): void {
  activeRun?.abort()
  const controller = new AbortController()
  activeRun = controller

  let manifestFetchTimedOut = false
  const timeoutId = window.setTimeout(() => {
    manifestFetchTimedOut = true
    controller.abort()
  }, MANIFEST_TIMEOUT_MS)

  async function run() {
    try {
      const result = await fetchCatalogManifest('catalog-manifest.json', {
        signal: controller.signal,
      })

      if (controller.signal.aborted) return

      perfLog('Manifest loaded, starting asset preload', {
        collections: result.collections.length,
        catalog: result.catalog.length,
      })

      assetsActions.setAssets({
        catalog: result.catalog,
        collections: result.collections,
        environmentConfig: result.environment,
      })

      // The gated set the restored scene references (empty for a fresh scene):
      // only these are warmed here and gate the unlock; the rest loads on demand.
      const gatedCollectionPaths = resolveReferencedCollectionPaths({
        href: window.location.href,
        draft: loadSceneDraft(),
        catalog: result.catalog,
        collections: result.collections,
      })
      collectionLoadingActions.setGatedCollectionPaths(gatedCollectionPaths)

      editorLifecycleActions.beginAssetLoad()

      warmCollectionBytes(gatedCollectionPaths)
    } catch (error) {
      // A supersede or cancel abort is not an outcome; only the timeout abort
      // reports (as manifest-timeout, not a spurious manifest-network).
      if (controller.signal.aborted && !manifestFetchTimedOut) return

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
      if (activeRun === controller) {
        activeRun = null
      }
    }
  }

  void run()
}

export function cancelStartupBootstrap(): void {
  activeRun?.abort()
  activeRun = null
}
