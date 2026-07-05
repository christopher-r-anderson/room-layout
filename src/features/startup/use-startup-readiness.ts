import { useEffect } from 'react'
import {
  completeAssetLoad,
  notifyAssetError,
} from '@/core/operations/startup-coordinator'
import { useCollections } from '@/core/stores/assets-store'
import { useGatedCollectionPaths } from '@/core/stores/startup-gate-store'
import {
  useFailedCollections,
  useLoadedCollections,
} from '@/core/stores/collection-loading-store'
import {
  useSceneMounted,
  useStartupLoadingActive,
} from '@/core/stores/editor-lifecycle-store'

// Resolves the startup outcome in core (not in the Scene): gated on the scene
// having mounted so the overlay never lifts before first paint, any gated
// collection failing is a startup error, and all gated collections parsed
// completes it. Firing flips the phase off 'loading', which is the fire-once guard
// - a retry returns to 'loading' and re-arms it. See
// docs/architecture/startup-and-asset-loading.md.
export function useStartupReadiness() {
  const loadingActive = useStartupLoadingActive()
  const sceneMounted = useSceneMounted()
  const collections = useCollections()
  const gatedCollectionPaths = useGatedCollectionPaths()
  const failedCollections = useFailedCollections()
  const loadedCollections = useLoadedCollections()

  useEffect(() => {
    if (!loadingActive || !sceneMounted || collections.length === 0) {
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
    sceneMounted,
    collections.length,
    gatedCollectionPaths,
    failedCollections,
    loadedCollections,
  ])
}
