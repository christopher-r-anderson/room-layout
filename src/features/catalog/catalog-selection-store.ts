import { create } from 'zustand'
import type { FurnitureCatalogEntry } from '@/domain/catalog'
import {
  getCatalogEntries,
  useCatalogEntries,
} from '@/core/stores/assets-store'

// Catalog-only UI state: which catalog entry the Add Furniture drawer will place.
// Feature-local (not cross-cutting), but store-backed so the non-React add action
// can read the active id synchronously.
interface CatalogSelectionStoreState {
  selectedCatalogId: string
}

const useCatalogSelectionStore = create<CatalogSelectionStoreState>()(() => ({
  selectedCatalogId: '',
}))

export const catalogSelectionActions = {
  setSelectedCatalogId: (catalogId: string) => {
    useCatalogSelectionStore.setState({ selectedCatalogId: catalogId })
  },
  reset: () => {
    useCatalogSelectionStore.setState(
      useCatalogSelectionStore.getInitialState(),
      true,
    )
  },
}

export function resetCatalogSelectionStore() {
  catalogSelectionActions.reset()
}

function resolveActiveCatalogId(
  selectedCatalogId: string,
  catalog: FurnitureCatalogEntry[],
): string {
  if (
    selectedCatalogId &&
    catalog.some((entry) => entry.id === selectedCatalogId)
  ) {
    return selectedCatalogId
  }

  // No default: the user must actively pick an item to add. The first catalog
  // entry is not a recommendation, and pre-selecting it would mis-announce a
  // choice for screen readers and speculatively prefetch its model on open.
  return ''
}

/**
 * Active id used by both the drawer (selected radio) and the add action: the
 * stored selection when still valid, otherwise empty (nothing selected).
 */
export function getActiveCatalogId(): string {
  return resolveActiveCatalogId(
    useCatalogSelectionStore.getState().selectedCatalogId,
    getCatalogEntries(),
  )
}

export function useActiveCatalogId(): string {
  const selectedCatalogId = useCatalogSelectionStore(
    (state) => state.selectedCatalogId,
  )
  const catalog = useCatalogEntries()

  return resolveActiveCatalogId(selectedCatalogId, catalog)
}
