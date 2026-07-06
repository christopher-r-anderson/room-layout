import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import type { EqualityChecker } from '../types/store.types'

interface Assets {
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  environmentConfig: EnvironmentMaterialConfig | null
}

interface AssetsStoreState extends Assets {
  // Derived once per manifest: catalogId -> its collection's sourcePath. The
  // manifest is immutable after load, so consumers (catalog tiles, the add flow,
  // the gate resolution) index into this instead of re-joining catalog x
  // collections at each call site.
  sourcePathByCatalogId: Map<string, string>
  setAssets: (assets: Assets) => void
  reset: () => void
}

export function buildSourcePathByCatalogId(
  catalog: FurnitureCatalogEntry[],
  collections: FurnitureCollection[],
): Map<string, string> {
  const sourcePathByCollectionId = new Map(
    collections.map((collection) => [collection.id, collection.sourcePath]),
  )
  const byCatalogId = new Map<string, string>()
  for (const entry of catalog) {
    const sourcePath = sourcePathByCollectionId.get(entry.collectionId)
    if (sourcePath !== undefined) {
      byCatalogId.set(entry.id, sourcePath)
    }
  }
  return byCatalogId
}

function getInitialAssetsState() {
  return {
    catalog: [],
    collections: [],
    environmentConfig: null,
    sourcePathByCatalogId: new Map<string, string>(),
  }
}

// App-facing mirror of the startup-loaded catalog manifest. Startup owns the
// load; this store lets features read the resolved catalog/collections/finishes
// through narrow hooks instead of receiving them threaded through app chrome.
export const assetsStore = createStore<AssetsStoreState>()(
  subscribeWithSelector((set, get) => ({
    ...getInitialAssetsState(),
    setAssets: (assets) => {
      set((state) => ({
        ...state,
        ...assets,
        sourcePathByCatalogId: buildSourcePathByCatalogId(
          assets.catalog,
          assets.collections,
        ),
      }))
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

// Imperative lookup for action code (the add flow); the hook below is the React
// equivalent.
export function getSourcePathForCatalogId(catalogId: string): string | null {
  return assetsStore.getState().sourcePathByCatalogId.get(catalogId) ?? null
}

export const useCatalogEntries = () => useAssetsStore((state) => state.catalog)
export const useCollections = () => useAssetsStore((state) => state.collections)
export const useEnvironmentConfig = () =>
  useAssetsStore((state) => state.environmentConfig)
export const useSourcePathByCatalogId = () =>
  useAssetsStore((state) => state.sourcePathByCatalogId)
