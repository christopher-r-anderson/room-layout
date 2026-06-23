import { useCallback } from 'react'
import { useItems, useSelectedFurniture } from '@/core/stores/scene-document-store'
import { selectionFocusActions } from '@/core/stores/selection-focus-store'

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
      selectionFocusActions.requestOutlinerFocus({
        token: Date.now(),
        targetSelectedId: selectedFurniture.id,
      })
      return
    }

    if (items.length > 0) {
      selectionFocusActions.requestOutlinerFocus({
        token: Date.now(),
        preferredIndex: 0,
      })
      return
    }

    selectionFocusActions.requestOutlinerFocus({
      token: Date.now(),
      focusContainer: true,
    })
  }, [items, selectedFurniture])
}
