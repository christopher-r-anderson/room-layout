export interface SortableItem {
  id: string
  pointerTarget: { x: number; y: number } | null
}

export type BrowseDirection = 'next' | 'prev' | 'first' | 'last'

/**
 * Top-to-bottom, then left-to-right within each row; items without screen
 * coordinates are excluded.
 */
export function sortSpatially(
  items: readonly SortableItem[],
  rowTolerancePx = 48,
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

    if (
      row &&
      item.pointerTarget.y - row[0].pointerTarget.y <= rowTolerancePx
    ) {
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

/**
 * Resolves the next browse target id within a spatially-ordered list. `next`/
 * `prev` wrap and start from the ends when there is no current id; `first`/
 * `last` jump to the edges. Returns null when the list is empty.
 */
export function resolveBrowseTarget(
  orderedIds: readonly string[],
  currentId: string | null,
  direction: BrowseDirection,
): string | null {
  if (orderedIds.length === 0) {
    return null
  }

  const currentIndex = orderedIds.indexOf(currentId ?? '')

  let nextIndex: number

  if (direction === 'first') {
    nextIndex = 0
  } else if (direction === 'last') {
    nextIndex = orderedIds.length - 1
  } else if (direction === 'next') {
    nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % orderedIds.length
  } else {
    nextIndex =
      currentIndex === -1
        ? orderedIds.length - 1
        : (currentIndex - 1 + orderedIds.length) % orderedIds.length
  }

  return orderedIds[nextIndex]
}
