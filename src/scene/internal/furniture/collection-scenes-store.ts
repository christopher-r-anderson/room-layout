import { useMemo } from 'react'
import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { Object3D } from 'three'
import { useItems } from '@/core/scene-contracts'

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
  // sourcePaths explicitly requested on demand (e.g. an add for a collection the
  // restored scene did not reference). Kept for the session; loaders for these
  // stay mounted so the parsed scene remains available.
  wanted: Set<string>
}

const collectionScenesStore = createStore<CollectionScenesState>()(
  subscribeWithSelector(() => ({
    loaded: new Map<string, Object3D>(),
    wanted: new Set<string>(),
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
  unregisterScene(path: string) {
    collectionScenesStore.setState((state) => {
      if (!state.loaded.has(path)) {
        return state
      }
      const loaded = new Map(state.loaded)
      loaded.delete(path)
      return { ...state, loaded }
    })
  },
  wantCollection(path: string) {
    collectionScenesStore.setState((state) => {
      if (state.wanted.has(path)) {
        return state
      }
      const wanted = new Set(state.wanted)
      wanted.add(path)
      return { ...state, wanted }
    })
  },
  reset() {
    collectionScenesStore.setState({
      loaded: new Map<string, Object3D>(),
      wanted: new Set<string>(),
    })
  },
}

export function getLoadedCollectionScenes(): Map<string, Object3D> {
  return collectionScenesStore.getState().loaded
}

function isCollectionLoaded(path: string): boolean {
  return collectionScenesStore.getState().loaded.has(path)
}

// Ensures a collection is parsed and registered, resolving once its scene is in
// the store. Requesting it adds the path to `wanted`, which mounts a loader (via
// useActiveOnDemandCollectionPaths); the promise resolves off the store so the
// caller never races a stale React render. Callers (the add flow) await this
// before a mutation that needs the collection's source scene.
export function ensureCollectionLoaded(path: string): Promise<void> {
  if (isCollectionLoaded(path)) {
    return Promise.resolve()
  }

  collectionScenesActions.wantCollection(path)

  return new Promise<void>((resolve) => {
    const unsubscribe = collectionScenesStore.subscribe(
      (state) => state.loaded,
      (loaded) => {
        if (loaded.has(path)) {
          unsubscribe()
          resolve()
        }
      },
    )

    // Guard the window between the initial check and subscribing.
    if (isCollectionLoaded(path)) {
      unsubscribe()
      resolve()
    }
  })
}

export function resetCollectionScenes() {
  collectionScenesActions.reset()
}

export function useLoadedCollectionScenes(): Map<string, Object3D> {
  return useStoreWithEqualityFn(collectionScenesStore, (state) => state.loaded)
}

// The collections that need an on-demand loader mounted right now: every
// collection referenced by a current scene item, plus anything explicitly
// wanted, minus the gated collections (those already have loaders under the
// startup seed gate). Added items keep their collection mounted via this set.
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
