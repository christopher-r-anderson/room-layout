import type { FurnitureItem } from '@/domain/furniture'
import {
  useItems,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { useSelectedId, useSelectionStore } from '@/core/stores/selection-store'

/**
 * The selected item, joined from the selection session (the pointer) and the
 * document (the items). Cross-store derived state, so it lives here as a value
 * module rather than in either store.
 */
export function useSelectedFurniture(): FurnitureItem | null {
  const selectedId = useSelectedId()
  const items = useItems()

  return findSelectedFurniture(items, selectedId)
}

/** Non-reactive read of {@link useSelectedFurniture} for use outside React. */
export function getSelectedFurniture(): FurnitureItem | null {
  return findSelectedFurniture(
    useSceneDocumentStore.getState().history.present,
    useSelectionStore.getState().selectedId,
  )
}

function findSelectedFurniture(
  items: FurnitureItem[],
  selectedId: string | null,
): FurnitureItem | null {
  if (selectedId === null) {
    return null
  }

  return items.find((item) => item.id === selectedId) ?? null
}
