import { useMemo } from 'react'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { Object3D } from 'three'
import { useItems } from '@/core/scene-contracts'
import type { CollectionLoadFailureKind } from '../../scene.types'

// Reactive registry of parsed furniture-collection scenes, plus the set of
// collections something has asked to load on demand. This replaces the old
// `useGLTF(allCollections)` call in Scene that suspended the whole scene (room
// included) until every collection parsed. Now the environment renders
// immediately and each collection is loaded independently by a CollectionLoader
// that registers its parsed scene here; Scene reads the map to render furniture,
// and the startup readiness gate waits only on the collections the restored
// scene actually references.
interface CollectionScenesState {
  // sourcePath -> parsed GLTF scene root.
  loaded: Map<string, Object3D>
  // sourcePaths requested on demand (e.g. an add for a collection the restored
  // scene did not reference). Drives which on-demand collections the loader
  // pulls in; kept for the session so an added item's collection stays available.
  wanted: Set<string>
  // sourcePaths whose on-demand load failed, mapped to why. A failed collection
  // is not retried automatically; requesting it again (a re-add) clears the mark
  // and retries. 'unavailable' (permanent) collections are never retried and are
  // surfaced as unavailable in the catalog.
  failed: Map<string, CollectionLoadFailureKind>
}

const collectionScenesStore = createStore<CollectionScenesState>()(
  subscribeWithSelector(() => ({
    loaded: new Map<string, Object3D>(),
    wanted: new Set<string>(),
    failed: new Map<string, CollectionLoadFailureKind>(),
  })),
)

export const collectionScenesActions = {
  registerScene(path: string, scene: Object3D) {
    collectionScenesStore.setState((state) => {
      if (state.loaded.get(path) === scene) {
        return state
      }
      const loaded = new Map(state.loaded)
      loaded.set(path, scene)
      return { ...state, loaded }
    })
  },
  // Request an on-demand collection (or re-request a failed one). Always writes a
  // fresh `wanted` set so useActiveOnDemandCollectionPaths recomputes and the
  // loader re-attempts, and clears any prior failure so the retry can proceed.
  requestCollection(path: string) {
    collectionScenesStore.setState((state) => {
      const wanted = new Set(state.wanted)
      wanted.add(path)
      const failed = new Map(state.failed)
      failed.delete(path)
      return { ...state, wanted, failed }
    })
  },
  markFailed(path: string, kind: CollectionLoadFailureKind) {
    collectionScenesStore.setState((state) => {
      if (state.failed.get(path) === kind) {
        return state
      }
      const failed = new Map(state.failed)
      failed.set(path, kind)
      return { ...state, failed }
    })
  },
  reset() {
    collectionScenesStore.setState({
      loaded: new Map<string, Object3D>(),
      wanted: new Set<string>(),
      failed: new Map<string, CollectionLoadFailureKind>(),
    })
  },
}

export function getLoadedCollectionScenes(): Map<string, Object3D> {
  return collectionScenesStore.getState().loaded
}

export function isCollectionLoaded(path: string): boolean {
  return collectionScenesStore.getState().loaded.has(path)
}

export function isCollectionFailed(path: string): boolean {
  return collectionScenesStore.getState().failed.has(path)
}

export function getCollectionFailureKind(
  path: string,
): CollectionLoadFailureKind | null {
  return collectionScenesStore.getState().failed.get(path) ?? null
}

// Reactive map of failed collections to why they failed, for the catalog to mark
// unavailable (permanent) items.
export function useFailedCollections(): Map<string, CollectionLoadFailureKind> {
  return useStoreWithEqualityFn(collectionScenesStore, (state) => state.failed)
}

// Ensures a collection is parsed and registered. Requesting it (re)marks it
// wanted and clears any prior failure, which makes the loader (re)attempt it; the
// promise resolves once the scene registers, or rejects if the load fails - so
// the add flow can surface an error and recover instead of hanging. Settles off
// the store so the caller never races a stale React render.
export function ensureCollectionLoaded(path: string): Promise<void> {
  if (isCollectionLoaded(path)) {
    return Promise.resolve()
  }

  collectionScenesActions.requestCollection(path)

  return new Promise<void>((resolve, reject) => {
    let settled = false
    const finish = (run: () => void) => {
      if (settled) {
        return
      }
      settled = true
      unsubscribe()
      run()
    }
    const unsubscribe = collectionScenesStore.subscribe((state) => {
      if (state.loaded.has(path)) {
        finish(resolve)
      } else if (state.failed.has(path)) {
        finish(() => {
          reject(new Error(`furniture collection failed to load: ${path}`))
        })
      }
    })

    // Guard the window between the initial check and subscribing.
    if (isCollectionLoaded(path)) {
      finish(resolve)
    }
  })
}

export function resetCollectionScenes() {
  collectionScenesActions.reset()
}

export function useLoadedCollectionScenes(): Map<string, Object3D> {
  return useStoreWithEqualityFn(collectionScenesStore, (state) => state.loaded)
}

// The on-demand collections the loader should pull in right now: every
// collection referenced by a current scene item, plus anything explicitly
// wanted, minus the gated collections (which the loader already handles from the
// startup prefetch). Added items keep their collection loaded via this set.
export function useActiveOnDemandCollectionPaths(
  gatedCollectionPaths: string[],
): string[] {
  const items = useItems()
  const wanted = useStoreWithEqualityFn(
    collectionScenesStore,
    (state) => state.wanted,
  )

  return useMemo(() => {
    const gated = new Set(gatedCollectionPaths)
    const paths = new Set<string>()
    for (const item of items) {
      if (!gated.has(item.sourcePath)) {
        paths.add(item.sourcePath)
      }
    }
    for (const path of wanted) {
      if (!gated.has(path)) {
        paths.add(path)
      }
    }
    return [...paths]
  }, [items, wanted, gatedCollectionPaths])
}
