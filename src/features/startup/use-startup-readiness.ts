import { useEffect } from 'react'
import {
  completeAssetLoad,
  notifyAssetError,
} from '@/core/operations/startup-coordinator'
import {
  useFailedCollections,
  useGatedCollectionPaths,
  useGatedCollectionsResolved,
  useLoadedCollections,
} from '@/core/stores/collection-loading-store'
import {
  useSceneReady,
  useStartupLoadingActive,
} from '@/core/stores/editor-lifecycle-store'

/**
 * Resolves the startup outcome in core (not in the Scene): gated on the scene
 * services being live so the overlay never lifts before first paint, any gated
 * collection failing is a startup error, and all gated collections parsed
 * completes it. Firing flips the phase off 'loading', which is the fire-once guard
 * - a retry returns to 'loading' and re-arms it. See
 * docs/architecture/startup-and-asset-loading.md.
 */
export function useStartupReadiness() {
  const loadingActive = useStartupLoadingActive()
  const sceneReady = useSceneReady()
  const gatedCollectionsResolved = useGatedCollectionsResolved()
  const gatedCollectionPaths = useGatedCollectionPaths()
  const failedCollections = useFailedCollections()
  const loadedCollections = useLoadedCollections()

  useEffect(() => {
    // An unresolved gate (bootstrap has not computed it yet, or a retry reset it)
    // means the outcome is not knowable - a fresh scene resolves to [], not null.
    if (!loadingActive || !sceneReady || !gatedCollectionsResolved) {
      return
    }

    const failedGatedPath = gatedCollectionPaths.find((path) =>
      failedCollections.has(path),
    )
    if (failedGatedPath) {
      notifyAssetError(
        new Error(
          `gated furniture collection failed to load: ${failedGatedPath}`,
        ),
      )
      return
    }

    const gatedReady = gatedCollectionPaths.every((path) =>
      loadedCollections.has(path),
    )
    if (gatedReady) {
      completeAssetLoad()
    }
  }, [
    loadingActive,
    sceneReady,
    gatedCollectionsResolved,
    gatedCollectionPaths,
    failedCollections,
    loadedCollections,
  ])
}
