export interface SortableItem {
  id: string
  pointerTarget: { x: number; y: number } | null
}

/**
 * Sorts furniture items by their screen-space position.
 * Items are ordered top-to-bottom, then left-to-right within each row.
 * Items without screen coordinates are excluded from the result.
 */
export function sortSpatially(
  items: readonly SortableItem[],
  rowTolerance = 48,
): string[] {
  const visible = items.filter(
    (
      item,
    ): item is SortableItem & { pointerTarget: { x: number; y: number } } =>
      item.pointerTarget !== null,
  )

  visible.sort((a, b) => {
    const dy = a.pointerTarget.y - b.pointerTarget.y
    if (Math.abs(dy) > rowTolerance) {
      return dy
    }
    return a.pointerTarget.x - b.pointerTarget.x
  })

  return visible.map((item) => item.id)
}
