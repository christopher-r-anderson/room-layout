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

  const sortedByTopEdge = [...visible].sort((a, b) => {
    const byY = a.pointerTarget.y - b.pointerTarget.y
    if (byY !== 0) {
      return byY
    }

    const byX = a.pointerTarget.x - b.pointerTarget.x
    if (byX !== 0) {
      return byX
    }

    return a.id.localeCompare(b.id)
  })

  const rows: (typeof sortedByTopEdge)[] = []

  for (const item of sortedByTopEdge) {
    const row = rows.at(-1)

    if (row && item.pointerTarget.y - row[0].pointerTarget.y <= rowTolerance) {
      row.push(item)
      continue
    }

    rows.push([item])
  }

  return rows.flatMap((row) =>
    row
      .sort((a, b) => {
        const byX = a.pointerTarget.x - b.pointerTarget.x
        if (byX !== 0) {
          return byX
        }

        const byY = a.pointerTarget.y - b.pointerTarget.y
        if (byY !== 0) {
          return byY
        }

        return a.id.localeCompare(b.id)
      })
      .map((item) => item.id),
  )
}
