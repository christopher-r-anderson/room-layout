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

// Environment-first startup outcome, observed in core rather than in the Scene.
// Once startup is loading AND the scene has mounted (so the loading overlay never
// lifts before first paint) AND the manifest is present, it resolves the gated
// collections the restored scene references:
// - any gated collection failing to load is a startup error;
// - otherwise, once every gated collection has parsed, startup is complete.
// An empty scene has no gated collections, so it completes as soon as the scene is
// mounted and the manifest is present - it never waits on furniture. Firing flips
// the phase off 'loading', so this runs at most once per startup cycle without a
// dedicated fire-once guard; a retry returns to 'loading' and re-arms it.
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
