import { findFurnitureSpawnPosition } from '@/domain/geometry/furniture-spawn'
import {
  resolveAbsoluteFurnitureTransform,
  resolveMovedFurniturePosition,
  resolveRotatedFurnitureTransform,
  type LayoutBounds,
} from '@/domain/geometry/furniture-layout'
import {
  commitHistoryPresent,
  replaceHistoryPresent,
  type HistoryState,
} from '@/shared/lib/ui/editor-history'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import type { CollectionNodeDefaults } from '@/core/stores/collection-scene-registry'
import { getCollection } from '@/domain/catalog'
import type { FurnitureInstance, FurnitureItem } from '@/domain/furniture'
import type {
  MoveSelectionResult,
  UpdateSelectionTransformResult,
} from '@/core/scene.types'

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
    left.uiBoundsNodeName === right.uiBoundsNodeName &&
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
  nodeDefaultsByPath: Map<string, Map<string, CollectionNodeDefaults>>,
  id: string,
  catalogId: string,
  catalog: FurnitureCatalogEntry[],
  collections: FurnitureCollection[],
  overrides?: {
    position?: [number, number, number]
    rotationY?: number
  },
): FurnitureItem {
  const entry = catalog.find((e) => e.id === catalogId) ?? null

  if (!entry) {
    throw new Error(`unknown furniture catalog entry: ${catalogId}`)
  }

  const collection = getCollection(entry.collectionId, collections)

  const sourcePath = collection.sourcePath
  const nodeDefaults = nodeDefaultsByPath.get(sourcePath)

  if (!nodeDefaults) {
    throw new Error(
      `source scene not loaded for collection: ${entry.collectionId}`,
    )
  }

  const node = nodeDefaults.get(entry.nodeName)

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
    uiBoundsNodeName: entry.uiBoundsNodeName,
    sourcePath,
    footprintSize: entry.footprintSize,
    position: overrides?.position ?? node.position,
    rotationY: overrides?.rotationY ?? normalizeAngleRadians(node.rotationY),
  }
}

/**
 * Reconstructs full FurnitureItem objects from serialized FurnitureInstance
 * records (id, catalogId, position, rotationY) using the loaded catalog and
 * source scenes. Used by restoreInitialLayout to seed the scene from URL data.
 */
export function buildFurnitureItemsFromInstances(
  instances: FurnitureInstance[],
  catalog: FurnitureCatalogEntry[],
  collections: FurnitureCollection[],
  nodeDefaultsByPath: Map<string, Map<string, CollectionNodeDefaults>>,
): FurnitureItem[] {
  return instances.map((instance) =>
    createFurnitureItem(
      nodeDefaultsByPath,
      instance.id,
      instance.catalogId,
      catalog,
      collections,
      { position: instance.position, rotationY: instance.rotationY },
    ),
  )
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
  nodeDefaultsByPath,
  catalogId,
  nextId,
  catalog,
  collections,
  bounds,
  edgeSnapThreshold,
  snapSize,
}: {
  history: HistoryState<FurnitureItem[]>
  nodeDefaultsByPath: Map<string, Map<string, CollectionNodeDefaults>>
  catalogId: string
  nextId: string
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  bounds: LayoutBounds
  edgeSnapThreshold: number
  snapSize: number
}): {
  history: HistoryState<FurnitureItem[]>
  result: AddFurnitureResult
  incrementInstanceId: boolean
} {
  const entry = catalog.find((e) => e.id === catalogId) ?? null

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

  const nextItem = createFurnitureItem(
    nodeDefaultsByPath,
    nextId,
    entry.id,
    catalog,
    collections,
  )
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

export function resolveMoveSelectionInHistory({
  history,
  selectedId,
  isDragging,
  delta,
  bounds,
  edgeSnapThreshold,
}: {
  history: HistoryState<FurnitureItem[]>
  selectedId: string | null
  isDragging: boolean
  delta: { x: number; z: number }
  bounds: LayoutBounds
  edgeSnapThreshold: number
}): {
  history: HistoryState<FurnitureItem[]>
  result: MoveSelectionResult
} {
  const furnitureItems = history.present

  if (isDragging) {
    return { history, result: { ok: false, reason: 'dragging' } }
  }

  if (!selectedId) {
    return { history, result: { ok: false, reason: 'no-selection' } }
  }

  const activeItem = furnitureItems.find((item) => item.id === selectedId)

  if (!activeItem) {
    return { history, result: { ok: false, reason: 'no-selection' } }
  }

  const proposedPosition: [number, number, number] = [
    activeItem.position[0] + delta.x,
    activeItem.position[1],
    activeItem.position[2] + delta.z,
  ]

  const resolvedPosition = resolveMovedFurniturePosition({
    movingId: selectedId,
    proposedPosition,
    items: furnitureItems,
    edgeSnapThreshold,
    bounds,
  })

  if (!resolvedPosition) {
    return { history, result: { ok: false, reason: 'blocked-collision' } }
  }

  const positionUnchanged =
    resolvedPosition[0] === activeItem.position[0] &&
    resolvedPosition[1] === activeItem.position[1] &&
    resolvedPosition[2] === activeItem.position[2]

  if (positionUnchanged) {
    // The clamp swallowed the move entirely: distinguish "hit a wall" (the user
    // pushed but bounds held) from "nothing to do" (no displacement requested).
    const attemptedMovement =
      proposedPosition[0] !== activeItem.position[0] ||
      proposedPosition[2] !== activeItem.position[2]

    return {
      history,
      result: {
        ok: false,
        reason: attemptedMovement ? 'blocked-bounds' : 'no-op',
      },
    }
  }

  const nextFurniture = furnitureItems.map((item) => {
    if (item.id !== selectedId) {
      return item
    }

    return {
      ...item,
      position: resolvedPosition,
    }
  })

  return {
    history: commitHistoryPresent(
      history,
      nextFurniture,
      areFurnitureCollectionsEqual,
    ),
    result: { ok: true, position: resolvedPosition },
  }
}

export function resolveSetSelectionTransformInHistory({
  history,
  selectedId,
  isDragging,
  input,
  bounds,
}: {
  history: HistoryState<FurnitureItem[]>
  selectedId: string | null
  isDragging: boolean
  input: { position?: [number, number, number]; rotationY?: number }
  bounds: LayoutBounds
}): {
  history: HistoryState<FurnitureItem[]>
  result: UpdateSelectionTransformResult
} {
  const furnitureItems = history.present

  if (isDragging) {
    return { history, result: { ok: false, reason: 'dragging' } }
  }

  if (!selectedId) {
    return { history, result: { ok: false, reason: 'no-selection' } }
  }

  const activeItem = furnitureItems.find((item) => item.id === selectedId)

  if (!activeItem) {
    return { history, result: { ok: false, reason: 'no-selection' } }
  }

  const nextPosition = input.position ?? activeItem.position
  const nextRotationY = input.rotationY ?? activeItem.rotationY

  if (
    nextPosition[0] === activeItem.position[0] &&
    nextPosition[1] === activeItem.position[1] &&
    nextPosition[2] === activeItem.position[2] &&
    nextRotationY === activeItem.rotationY
  ) {
    return { history, result: { ok: false, reason: 'no-op' } }
  }

  const resolvedTransform = resolveAbsoluteFurnitureTransform({
    movingId: selectedId,
    proposedPosition: nextPosition,
    proposedRotationY: nextRotationY,
    items: furnitureItems,
    bounds,
  })

  if (!resolvedTransform) {
    return { history, result: { ok: false, reason: 'no-selection' } }
  }

  if (!resolvedTransform.ok) {
    return { history, result: resolvedTransform }
  }

  const nextFurniture = furnitureItems.map((item) => {
    if (item.id !== selectedId) {
      return item
    }

    return {
      ...item,
      position: resolvedTransform.position,
      rotationY: resolvedTransform.rotationY,
    }
  })

  const nextHistory = commitHistoryPresent(
    history,
    nextFurniture,
    areFurnitureCollectionsEqual,
  )
  const updatedItem = nextHistory.present.find((item) => item.id === selectedId)

  if (!updatedItem) {
    return { history, result: { ok: false, reason: 'no-selection' } }
  }

  return { history: nextHistory, result: { ok: true, item: updatedItem } }
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
