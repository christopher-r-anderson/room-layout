import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { EnvironmentMaterialConfig } from '@/shared/lib/three/environment-materials'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/scene/objects/furniture-catalog'
import type { EqualityChecker } from '../types/store.types'

interface Assets {
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  environmentConfig: EnvironmentMaterialConfig | null
}

interface AssetsStoreState extends Assets {
  setAssets: (assets: Assets) => void
  reset: () => void
}

function getInitialAssetsState(): Assets {
  return {
    catalog: [],
    collections: [],
    environmentConfig: null,
  }
}

// App-facing mirror of the startup-loaded catalog manifest. Startup owns the
// load; this store lets features read the resolved catalog/collections/finishes
// through narrow hooks instead of receiving them threaded through app chrome.
export const assetsStore = createStore<AssetsStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialAssetsState(),
    setAssets: (assets) => {
      set((state) => ({ ...state, ...assets }))
    },
    reset: () => {
      set(() => ({
        ...getInitialAssetsState(),
        setAssets: get().setAssets,
        reset: get().reset,
      }))
    },
  })),
)

function useAssetsStore<T>(
  selector: (state: AssetsStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(assetsStore, selector, equalityFn)
}

export const assetsActions = {
  setAssets: (assets: Assets) => {
    assetsStore.getState().setAssets(assets)
  },
  reset: () => {
    assetsStore.getState().reset()
  },
}

export function resetAssetsStore() {
  assetsActions.reset()
}

export const useCatalogEntries = () => useAssetsStore((state) => state.catalog)
export const useCollections = () => useAssetsStore((state) => state.collections)
export const useEnvironmentConfig = () =>
  useAssetsStore((state) => state.environmentConfig)
