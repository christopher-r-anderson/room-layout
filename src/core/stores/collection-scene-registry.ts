import { create } from 'zustand'

// Reactive registry of parsed furniture-collection scene roots, keyed by
// sourcePath. The values are the engine's parsed objects, held opaquely so core
// stays three-free; the scene layer registers and reads them through its typed
// wrapper (scene/internal/furniture/collection-scene-registry). The map is
// partial and grows as collections parse, so the room renders before any
// furniture.
interface CollectionSceneRegistryState {
  loaded: Map<string, unknown>
}

const useCollectionSceneRegistryStore = create<CollectionSceneRegistryState>()(
  () => ({
    loaded: new Map<string, unknown>(),
  }),
)

export function registerParsedCollectionScene(path: string, scene: unknown) {
  useCollectionSceneRegistryStore.setState((state) => {
    if (state.loaded.get(path) === scene) {
      return state
    }
    const loaded = new Map(state.loaded)
    loaded.set(path, scene)
    return { loaded }
  })
}

export function getParsedCollectionScenes(): Map<string, unknown> {
  return useCollectionSceneRegistryStore.getState().loaded
}

export function useParsedCollectionScenes(): Map<string, unknown> {
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
