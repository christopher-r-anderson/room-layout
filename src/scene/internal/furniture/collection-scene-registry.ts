import { useStoreWithEqualityFn } from 'zustand/traditional'
import { createStore } from 'zustand/vanilla'
import type { Object3D } from 'three'

// Reactive registry of parsed furniture-collection scene roots, keyed by
// sourcePath. This is the render artifact of collection loading and the only piece
// that must live in the scene layer (it holds three.js objects). The loading
// lifecycle - what to load, progress, failures - lives in core
// (collection-loading-store); the loader writes the parsed Object3D here and
// reports the outcome there.
//
// The map is partial and grows as collections parse, so the room renders before
// any furniture and each item appears once its collection registers.
interface CollectionSceneRegistryState {
  loaded: Map<string, Object3D>
}

const collectionSceneRegistryStore =
  createStore<CollectionSceneRegistryState>()(() => ({
    loaded: new Map<string, Object3D>(),
  }))

export function registerCollectionScene(path: string, scene: Object3D) {
  collectionSceneRegistryStore.setState((state) => {
    if (state.loaded.get(path) === scene) {
      return state
    }
    const loaded = new Map(state.loaded)
    loaded.set(path, scene)
    return { loaded }
  })
}

export function getLoadedCollectionScenes(): Map<string, Object3D> {
  return collectionSceneRegistryStore.getState().loaded
}

export function useLoadedCollectionScenes(): Map<string, Object3D> {
  return useStoreWithEqualityFn(
    collectionSceneRegistryStore,
    (state) => state.loaded,
  )
}

// Drops every parsed scene. Called on the retry teardown (before the scene epoch
// remounts) so a fresh cycle re-parses from the re-downloaded bytes.
export function resetCollectionSceneRegistry() {
  collectionSceneRegistryStore.setState({ loaded: new Map<string, Object3D>() })
}
