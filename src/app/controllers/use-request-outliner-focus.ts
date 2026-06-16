import { useCallback } from 'react'
import {
  useItems,
  useSelectedFurniture,
} from '@/editor-state/scene-state-store'
import { selectionMetaActions } from '@/editor-state/selection-meta-store'

/**
 * Hook that provides a callback to request outliner focus with intelligent fallback.
 *
 * Fallback logic:
 * 1. If an item is selected, focus on that item in the outliner
 * 2. Else if items exist in the room, focus on the first item
 * 3. Else focus on the outliner container itself
 */
export function useRequestOutlinerFocus() {
  const items = useItems()
  const selectedFurniture = useSelectedFurniture()

  return useCallback(() => {
    if (selectedFurniture !== null) {
      selectionMetaActions.requestOutlinerFocus({
        token: Date.now(),
        targetSelectedId: selectedFurniture.id,
      })
      return
    }

    if (items.length > 0) {
      selectionMetaActions.requestOutlinerFocus({
        token: Date.now(),
        preferredIndex: 0,
      })
      return
    }

    selectionMetaActions.requestOutlinerFocus({
      token: Date.now(),
      focusContainer: true,
    })
  }, [items, selectedFurniture])
}
