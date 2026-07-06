import { create } from 'zustand'
import type { Object3D } from 'three'

// Reactive registry of parsed furniture-collection scene roots, keyed by
// sourcePath - the render artifact of collection loading, and the one piece that
// must live in the scene layer because it holds three.js objects (the loading
// lifecycle lives in core's collection-loading-store). The map is partial and grows
// as collections parse, so the room renders before any furniture.
interface CollectionSceneRegistryState {
  loaded: Map<string, Object3D>
}

const useCollectionSceneRegistryStore = create<CollectionSceneRegistryState>()(
  () => ({
    loaded: new Map<string, Object3D>(),
  }),
)

export function registerCollectionScene(path: string, scene: Object3D) {
  useCollectionSceneRegistryStore.setState((state) => {
    if (state.loaded.get(path) === scene) {
      return state
    }
    const loaded = new Map(state.loaded)
    loaded.set(path, scene)
    return { loaded }
  })
}

export function getLoadedCollectionScenes(): Map<string, Object3D> {
  return useCollectionSceneRegistryStore.getState().loaded
}

export function useLoadedCollectionScenes(): Map<string, Object3D> {
  return useCollectionSceneRegistryStore((state) => state.loaded)
}

// Drops every parsed scene. Called on the retry teardown (before the scene epoch
// remounts) so a fresh cycle re-parses from the re-downloaded bytes.
export function resetCollectionSceneRegistry() {
  useCollectionSceneRegistryStore.setState(
    useCollectionSceneRegistryStore.getInitialState(),
    true,
  )
}
