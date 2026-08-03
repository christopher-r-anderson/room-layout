import { create } from 'zustand'

/**
 * A catalog node's authored default transform, extracted from the parsed GLB at
 * registration so furniture mutations can seed new items without touching the
 * scene graph.
 */
export interface CollectionNodeDefaults {
  position: [number, number, number]
  rotationY: number
}

// Reactive registry of parsed furniture-collection scene roots, keyed by
// sourcePath. The values are the engine's parsed objects, held opaquely so core
// stays three-free; the scene layer registers and reads them through its typed
// wrapper (scene/internal/furniture/collection-scene-registry). The map is
// partial and grows as collections parse, so the room renders before any
// furniture.
interface CollectionSceneRegistryState {
  loaded: Map<string, unknown>
  nodeDefaultsByPath: Map<string, Map<string, CollectionNodeDefaults>>
}

const useCollectionSceneRegistryStore = create<CollectionSceneRegistryState>()(
  () => ({
    loaded: new Map<string, unknown>(),
    nodeDefaultsByPath: new Map<string, Map<string, CollectionNodeDefaults>>(),
  }),
)

export function registerParsedCollectionScene(
  path: string,
  scene: unknown,
  nodeDefaults: Map<string, CollectionNodeDefaults>,
) {
  useCollectionSceneRegistryStore.setState((state) => {
    if (state.loaded.get(path) === scene) {
      return state
    }
    const loaded = new Map(state.loaded)
    loaded.set(path, scene)
    const nodeDefaultsByPath = new Map(state.nodeDefaultsByPath)
    nodeDefaultsByPath.set(path, nodeDefaults)
    return { loaded, nodeDefaultsByPath }
  })
}

export function getParsedCollectionScenes(): Map<string, unknown> {
  return useCollectionSceneRegistryStore.getState().loaded
}

export function useParsedCollectionScenes(): Map<string, unknown> {
  return useCollectionSceneRegistryStore((state) => state.loaded)
}

export function getCollectionNodeDefaults(): Map<
  string,
  Map<string, CollectionNodeDefaults>
> {
  return useCollectionSceneRegistryStore.getState().nodeDefaultsByPath
}

/**
 * Drops every parsed scene. Called on the retry teardown (before the startup cycle
 * remounts) so a fresh cycle re-parses from the re-downloaded bytes.
 */
export function resetCollectionSceneRegistry() {
  useCollectionSceneRegistryStore.setState(
    useCollectionSceneRegistryStore.getInitialState(),
    true,
  )
}
