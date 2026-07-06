import {
  FURNITURE_EDGE_SNAP_THRESHOLD_METERS,
  FURNITURE_SNAP_SIZE_METERS,
  ROOM_LAYOUT_BOUNDS,
} from '@/domain/geometry/room-metrics'
import {
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { useAssetsStore } from '@/core/stores/assets-store'
import { getCollectionNodeDefaults } from '@/core/stores/collection-scene-registry'
import type {
  AddFurnitureResult,
  MoveSelectionResult,
  MoveSource,
  UpdateSelectionTransformResult,
} from '@/core/scene.types'
import {
  addFurnitureToHistory,
  createFurnitureInstanceId,
  deleteSelectionFromHistory,
  resolveMoveSelectionInHistory,
  resolveSetSelectionTransformInHistory,
  rotateSelectedFurnitureInHistory,
} from './furniture-operations'

// Furniture document mutations: each reads the authoritative history, runs the
// pure placement resolution and history transition (collision/bounds math lives
// in domain/geometry and furniture-operations), then writes the result back.
// Drag-guarded against the document's isDragging flag, which the scene's drag
// gesture sets synchronously.

export function deleteSelection(): boolean {
  const { history, selectedId } = useSceneDocumentStore.getState()
  const operationResult = deleteSelectionFromHistory(history, selectedId)

  if (!operationResult.deleted) {
    return false
  }

  sceneDocumentActions.setHistory(operationResult.history)
  sceneDocumentActions.setSelectedId(null)

  return true
}

export function moveSelection(
  delta: { x: number; z: number },
  _options?: { source?: MoveSource },
): MoveSelectionResult {
  void _options
  const { history, selectedId, isDragging } = useSceneDocumentStore.getState()
  const { history: nextHistory, result } = resolveMoveSelectionInHistory({
    history,
    selectedId,
    isDragging,
    delta,
    bounds: ROOM_LAYOUT_BOUNDS,
    edgeSnapThreshold: FURNITURE_EDGE_SNAP_THRESHOLD_METERS,
  })

  if (result.ok) {
    sceneDocumentActions.setHistory(nextHistory)
  }

  return result
}

export function setSelectionTransform(input: {
  position?: [number, number, number]
  rotationY?: number
}): UpdateSelectionTransformResult {
  const { history, selectedId, isDragging } = useSceneDocumentStore.getState()
  const { history: nextHistory, result } =
    resolveSetSelectionTransformInHistory({
      history,
      selectedId,
      isDragging,
      input,
      bounds: ROOM_LAYOUT_BOUNDS,
    })

  if (result.ok) {
    sceneDocumentActions.setHistory(nextHistory)
  }

  return result
}

export function rotateSelection(deltaRadians: number) {
  const { history, selectedId } = useSceneDocumentStore.getState()
  const nextHistory = rotateSelectedFurnitureInHistory({
    history,
    selectedId,
    deltaRadians,
    bounds: ROOM_LAYOUT_BOUNDS,
  })

  sceneDocumentActions.setHistory(nextHistory)
}

export function addFurniture(catalogId: string): AddFurnitureResult {
  const { history, instanceIdCounter } = useSceneDocumentStore.getState()
  const { catalog, collections } = useAssetsStore.getState()
  const operationResult = addFurnitureToHistory({
    history,
    // Read the freshly registered node defaults at call time: the add flow
    // awaits ensureCollectionLoaded before dispatching, so the collection is
    // registered even if React has not re-rendered yet.
    nodeDefaultsByPath: getCollectionNodeDefaults(),
    catalogId,
    nextId: createFurnitureInstanceId(instanceIdCounter + 1),
    catalog,
    collections,
    bounds: ROOM_LAYOUT_BOUNDS,
    edgeSnapThreshold: FURNITURE_EDGE_SNAP_THRESHOLD_METERS,
    snapSize: FURNITURE_SNAP_SIZE_METERS,
  })

  sceneDocumentActions.setHistory(operationResult.history)

  if (operationResult.incrementInstanceId) {
    sceneDocumentActions.setInstanceIdCounter(instanceIdCounter + 1)
    sceneDocumentActions.setSelectedId(
      operationResult.result.ok ? operationResult.result.id : null,
    )
  }

  return operationResult.result
}
