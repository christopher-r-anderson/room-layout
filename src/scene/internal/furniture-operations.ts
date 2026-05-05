import { findFurnitureSpawnPosition } from '@/lib/three/furniture-spawn'
import {
  resolveRotatedFurnitureTransform,
  type LayoutBounds,
} from '@/lib/three/furniture-layout'
import {
  commitHistoryPresent,
  replaceHistoryPresent,
  type HistoryState,
} from '@/lib/ui/editor-history'
import { type Object3D } from 'three'
import {
  getCollectionPath,
  getFurnitureCatalogEntry,
} from '../objects/furniture-catalog'
import type { FurnitureItem } from '../objects/furniture.types'

export type AddFurnitureResult =
  | { ok: true; id: string }
  | { ok: false; reason: 'unknown-catalog' | 'no-space' }

export function createFurnitureInstanceId(sequenceNumber: number) {
  return `furniture-instance-${String(sequenceNumber)}`
}

function normalizeAngleRadians(angleRadians: number) {
  const fullTurn = Math.PI * 2
  const normalized = angleRadians % fullTurn

  if (normalized < 0) {
    return normalized + fullTurn
  }

  return normalized
}

function areFurnitureItemsEqual(left: FurnitureItem, right: FurnitureItem) {
  return (
    left.id === right.id &&
    left.catalogId === right.catalogId &&
    left.name === right.name &&
    left.kind === right.kind &&
    left.collectionId === right.collectionId &&
    left.nodeName === right.nodeName &&
    left.sourcePath === right.sourcePath &&
    left.footprintSize.width === right.footprintSize.width &&
    left.footprintSize.depth === right.footprintSize.depth &&
    left.position[0] === right.position[0] &&
    left.position[1] === right.position[1] &&
    left.position[2] === right.position[2] &&
    left.rotationY === right.rotationY
  )
}

export function areFurnitureCollectionsEqual(
  left: FurnitureItem[],
  right: FurnitureItem[],
) {
  if (left.length !== right.length) {
    return false
  }

  return left.every((item, index) => {
    return areFurnitureItemsEqual(item, right[index])
  })
}

function createFurnitureItem(
  sourceScenesByPath: Map<string, Object3D>,
  id: string,
  catalogId: string,
  overrides?: {
    position?: [number, number, number]
    rotationY?: number
  },
): FurnitureItem {
  const entry = getFurnitureCatalogEntry(catalogId)

  if (!entry) {
    throw new Error(`unknown furniture catalog entry: ${catalogId}`)
  }

  const sourcePath = getCollectionPath(entry.collectionId)
  const sourceScene = sourceScenesByPath.get(sourcePath)

  if (!sourceScene) {
    throw new Error(
      `source scene not loaded for collection: ${entry.collectionId}`,
    )
  }

  const node = sourceScene.getObjectByName(entry.nodeName)

  if (!node) {
    throw new Error(`${entry.nodeName} node not found in GLTF scene`)
  }

  return {
    id,
    catalogId: entry.id,
    name: entry.name,
    kind: entry.kind,
    collectionId: entry.collectionId,
    nodeName: entry.nodeName,
    sourcePath,
    footprintSize: entry.footprintSize,
    position: overrides?.position ?? [
      node.position.x,
      node.position.y,
      node.position.z,
    ],
    rotationY: overrides?.rotationY ?? normalizeAngleRadians(node.rotation.y),
  }
}

export function updateFurniturePositionInHistory(
  history: HistoryState<FurnitureItem[]>,
  id: string,
  nextPosition: [number, number, number],
): HistoryState<FurnitureItem[]> {
  const nextFurniture = history.present.map((item) => {
    if (item.id !== id) {
      return item
    }

    const [nextX, nextY, nextZ] = nextPosition
    const [currentX, currentY, currentZ] = item.position

    if (currentX === nextX && currentY === nextY && currentZ === nextZ) {
      return item
    }

    return {
      ...item,
      position: nextPosition,
    }
  })

  return replaceHistoryPresent(
    history,
    nextFurniture,
    areFurnitureCollectionsEqual,
  )
}

export function rotateSelectedFurnitureInHistory({
  history,
  selectedId,
  deltaRadians,
  bounds,
}: {
  history: HistoryState<FurnitureItem[]>
  selectedId: string | null
  deltaRadians: number
  bounds: LayoutBounds
}): HistoryState<FurnitureItem[]> {
  if (!selectedId) {
    return history
  }

  const rotatingItem = history.present.find((item) => item.id === selectedId)

  if (!rotatingItem) {
    return history
  }

  const resolvedTransform = resolveRotatedFurnitureTransform({
    rotatingId: selectedId,
    proposedRotationY: normalizeAngleRadians(
      rotatingItem.rotationY + deltaRadians,
    ),
    items: history.present,
    bounds,
  })

  if (!resolvedTransform) {
    return history
  }

  const nextFurniture = history.present.map((item) => {
    if (item.id !== selectedId) {
      return item
    }

    return {
      ...item,
      position: resolvedTransform.position,
      rotationY: resolvedTransform.rotationY,
    }
  })

  return commitHistoryPresent(
    history,
    nextFurniture,
    areFurnitureCollectionsEqual,
  )
}

export function addFurnitureToHistory({
  history,
  sourceScenesByPath,
  catalogId,
  nextId,
  bounds,
  edgeSnapThreshold,
  snapSize,
}: {
  history: HistoryState<FurnitureItem[]>
  sourceScenesByPath: Map<string, Object3D>
  catalogId: string
  nextId: string
  bounds: LayoutBounds
  edgeSnapThreshold: number
  snapSize: number
}): {
  history: HistoryState<FurnitureItem[]>
  result: AddFurnitureResult
  incrementInstanceId: boolean
} {
  const entry = getFurnitureCatalogEntry(catalogId)

  if (!entry) {
    return {
      history,
      result: {
        ok: false,
        reason: 'unknown-catalog',
      },
      incrementInstanceId: false,
    }
  }

  const nextItem = createFurnitureItem(sourceScenesByPath, nextId, entry.id)
  const spawnPosition = findFurnitureSpawnPosition({
    item: nextItem,
    items: history.present,
    bounds,
    edgeSnapThreshold,
    snapSize,
  })

  if (!spawnPosition) {
    return {
      history,
      result: {
        ok: false,
        reason: 'no-space',
      },
      incrementInstanceId: false,
    }
  }

  const spawnedItem = {
    ...nextItem,
    position: spawnPosition,
  }

  return {
    history: commitHistoryPresent(
      history,
      [...history.present, spawnedItem],
      areFurnitureCollectionsEqual,
    ),
    result: {
      ok: true,
      id: spawnedItem.id,
    },
    incrementInstanceId: true,
  }
}

export function deleteSelectionFromHistory(
  history: HistoryState<FurnitureItem[]>,
  selectedId: string | null,
): {
  history: HistoryState<FurnitureItem[]>
  deleted: boolean
  deletedId: string | null
} {
  if (!selectedId) {
    return {
      history,
      deleted: false,
      deletedId: null,
    }
  }

  const nextFurniture = history.present.filter((item) => item.id !== selectedId)

  if (nextFurniture.length === history.present.length) {
    return {
      history,
      deleted: false,
      deletedId: null,
    }
  }

  return {
    history: commitHistoryPresent(
      history,
      nextFurniture,
      areFurnitureCollectionsEqual,
    ),
    deleted: true,
    deletedId: selectedId,
  }
}
