import { create } from 'zustand'
import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'

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

// App-facing mirror of the startup-loaded catalog manifest. Startup owns the
// load; this store lets features read the resolved catalog/collections/finishes
// through narrow hooks instead of receiving them threaded through app chrome.
export const useAssetsStore = create<AssetsStoreState>()(() => ({
  catalog: [],
  collections: [],
  environmentConfig: null,
  // getInitialState() hands back this exact Map on reset; setAssets replaces
  // it wholesale, so it must never be mutated in place.
  sourcePathByCatalogId: new Map<string, string>(),
}))

export const assetsActions = {
  setAssets: (assets: Assets) => {
    useAssetsStore.setState({
      ...assets,
      sourcePathByCatalogId: buildSourcePathByCatalogId(
        assets.catalog,
        assets.collections,
      ),
    })
  },
  reset: () => {
    useAssetsStore.setState(useAssetsStore.getInitialState(), true)
  },
}

export function resetAssetsStore() {
  assetsActions.reset()
}

// Imperative lookup for action code (the add flow); the hook below is the React
// equivalent.
export function getSourcePathForCatalogId(catalogId: string): string | null {
  return useAssetsStore.getState().sourcePathByCatalogId.get(catalogId) ?? null
}

export const useCatalogEntries = () => useAssetsStore((state) => state.catalog)

/** Non-reactive peer of {@link useCatalogEntries} for use outside React. */
export function getCatalogEntries() {
  return useAssetsStore.getState().catalog
}
export const useCollections = () => useAssetsStore((state) => state.collections)
export const useEnvironmentConfig = () =>
  useAssetsStore((state) => state.environmentConfig)
export const useSourcePathByCatalogId = () =>
  useAssetsStore((state) => state.sourcePathByCatalogId)
