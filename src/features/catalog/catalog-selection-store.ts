import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import {
  assetsStore,
  useCatalogEntries,
} from '@/core/stores/assets-store'

// Catalog-only UI state: which catalog entry the Add Furniture drawer will place.
// Feature-local (not cross-cutting), but store-backed so the non-React add action
// can read the active id synchronously.
interface CatalogSelectionStoreState {
  selectedCatalogId: string
  setSelectedCatalogId: (catalogId: string) => void
  reset: () => void
}

const catalogSelectionStore = createStore<CatalogSelectionStoreState>()(
  subscribeWithSelector((set) => ({
    selectedCatalogId: '',
    setSelectedCatalogId: (catalogId) => {
      set({ selectedCatalogId: catalogId })
    },
    reset: () => {
      set({ selectedCatalogId: '' })
    },
  })),
)

export const catalogSelectionActions = {
  setSelectedCatalogId: (catalogId: string) => {
    catalogSelectionStore.getState().setSelectedCatalogId(catalogId)
  },
  reset: () => {
    catalogSelectionStore.getState().reset()
  },
}

export function resetCatalogSelectionStore() {
  catalogSelectionActions.reset()
}

function resolveActiveCatalogId(
  selectedCatalogId: string,
  catalog: ReturnType<typeof assetsStore.getState>['catalog'],
): string {
  if (
    selectedCatalogId &&
    catalog.some((entry) => entry.id === selectedCatalogId)
  ) {
    return selectedCatalogId
  }

  return catalog[0]?.id ?? ''
}

// Active id used by both the drawer (selected radio) and the add action: the
// stored selection when still valid, otherwise the first catalog entry.
export function getActiveCatalogId(): string {
  return resolveActiveCatalogId(
    catalogSelectionStore.getState().selectedCatalogId,
    assetsStore.getState().catalog,
  )
}

export function useActiveCatalogId(): string {
  const selectedCatalogId = useStoreWithEqualityFn(
    catalogSelectionStore,
    (state) => state.selectedCatalogId,
  )
  const catalog = useCatalogEntries()

  return resolveActiveCatalogId(selectedCatalogId, catalog)
}
