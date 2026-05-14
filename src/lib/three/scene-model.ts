interface SceneComparableItem {
  catalogId: string
  position: readonly [number, number, number]
  rotationY: number
}

export interface SceneComparableState {
  items: readonly SceneComparableItem[]
  floorFinishId?: string
  wallFinishId?: string
}

function compareSceneItems(a: SceneComparableItem, b: SceneComparableItem) {
  const catalogCompare = a.catalogId.localeCompare(b.catalogId)

  if (catalogCompare !== 0) {
    return catalogCompare
  }

  for (let index = 0; index < 3; index += 1) {
    const positionCompare = a.position[index] - b.position[index]

    if (positionCompare !== 0) {
      return positionCompare
    }
  }

  return a.rotationY - b.rotationY
}

function normalizeItems(items: readonly SceneComparableItem[]) {
  return [...items].sort(compareSceneItems)
}

export function hasNoFurniture(state: Pick<SceneComparableState, 'items'>) {
  return state.items.length === 0
}

export function isSceneStateAtDefaults(
  state: SceneComparableState,
  defaults: SceneComparableState,
) {
  if (state.floorFinishId !== defaults.floorFinishId) {
    return false
  }

  if (state.wallFinishId !== defaults.wallFinishId) {
    return false
  }

  if (state.items.length !== defaults.items.length) {
    return false
  }

  const normalizedStateItems = normalizeItems(state.items)
  const normalizedDefaultItems = normalizeItems(defaults.items)

  return normalizedStateItems.every((item, index) => {
    const defaultItem = normalizedDefaultItems[index]

    return (
      item.catalogId === defaultItem.catalogId &&
      item.position[0] === defaultItem.position[0] &&
      item.position[1] === defaultItem.position[1] &&
      item.position[2] === defaultItem.position[2] &&
      item.rotationY === defaultItem.rotationY
    )
  })
}
