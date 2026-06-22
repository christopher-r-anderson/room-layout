import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { EnvironmentMaterialConfig } from '@/shared/lib/three/environment-materials'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/scene/objects/furniture-catalog'
import type { EqualityChecker } from './store-types'

interface SceneAssets {
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  environmentConfig: EnvironmentMaterialConfig | null
}

interface SceneAssetsStoreState extends SceneAssets {
  setSceneAssets: (assets: SceneAssets) => void
  reset: () => void
}

function getInitialSceneAssetsState(): SceneAssets {
  return {
    catalog: [],
    collections: [],
    environmentConfig: null,
  }
}

// App-facing mirror of the startup-loaded catalog manifest. Startup owns the
// load; this store lets features read the resolved catalog/collections/finishes
// through narrow hooks instead of receiving them threaded through app chrome.
const sceneAssetsStore = createStore<SceneAssetsStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialSceneAssetsState(),
    setSceneAssets: (assets) => {
      set((state) => ({ ...state, ...assets }))
    },
    reset: () => {
      set(() => ({
        ...getInitialSceneAssetsState(),
        setSceneAssets: get().setSceneAssets,
        reset: get().reset,
      }))
    },
  })),
)

function useSceneAssetsStore<T>(
  selector: (state: SceneAssetsStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(sceneAssetsStore, selector, equalityFn)
}

export const sceneAssetsActions = {
  setSceneAssets: (assets: SceneAssets) => {
    sceneAssetsStore.getState().setSceneAssets(assets)
  },
  reset: () => {
    sceneAssetsStore.getState().reset()
  },
}

export function resetSceneAssetsStore() {
  sceneAssetsActions.reset()
}

export const useEnvironmentConfig = () =>
  useSceneAssetsStore((state) => state.environmentConfig)
