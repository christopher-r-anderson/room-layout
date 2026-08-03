import {
  FURNITURE_EDGE_SNAP_THRESHOLD_METERS,
  FURNITURE_SNAP_SIZE_METERS,
  getRoomLayoutBounds,
} from '@/domain/geometry/room-metrics'
import {
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { useSceneSessionStore } from '@/core/stores/scene-session-store'
import { useSelectionStore } from '@/core/stores/selection-store'
import { applySelection } from './selection-mutations'
import { useAssetsStore } from '@/core/stores/assets-store'
import { getCollectionNodeDefaults } from '@/core/stores/collection-scene-registry'
import type {
  AddFurnitureResult,
  MoveSelectionResult,
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
// moveSelection, setSelectionTransform, and rotateSelection refuse to run
// mid-drag (the scene's gesture writes the session's isDragging flag
// synchronously); deleteSelection can land mid-drag (keyboard), and the drag
// gesture self-clears when its item disappears.

export function deleteSelection(): boolean {
  const { history } = useSceneDocumentStore.getState()
  const { selectedId } = useSelectionStore.getState()
  const operationResult = deleteSelectionFromHistory(history, selectedId)

  if (!operationResult.deleted) {
    return false
  }

  sceneDocumentActions.setHistory(operationResult.history)
  applySelection(null)

  return true
}

export function moveSelection(delta: {
  x: number
  z: number
}): MoveSelectionResult {
  const { history, roomSize } = useSceneDocumentStore.getState()
  const { isDragging } = useSceneSessionStore.getState()
  const { selectedId } = useSelectionStore.getState()
  const { history: nextHistory, result } = resolveMoveSelectionInHistory({
    history,
    selectedId,
    isDragging,
    delta,
    bounds: getRoomLayoutBounds(roomSize),
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
  const { history, roomSize } = useSceneDocumentStore.getState()
  const { isDragging } = useSceneSessionStore.getState()
  const { selectedId } = useSelectionStore.getState()
  const { history: nextHistory, result } =
    resolveSetSelectionTransformInHistory({
      history,
      selectedId,
      isDragging,
      input,
      bounds: getRoomLayoutBounds(roomSize),
    })

  if (result.ok) {
    sceneDocumentActions.setHistory(nextHistory)
  }

  return result
}

export function rotateSelection(deltaRadians: number): boolean {
  if (useSceneSessionStore.getState().isDragging) {
    return false
  }

  const { history, roomSize } = useSceneDocumentStore.getState()
  const { selectedId } = useSelectionStore.getState()
  const nextHistory = rotateSelectedFurnitureInHistory({
    history,
    selectedId,
    deltaRadians,
    bounds: getRoomLayoutBounds(roomSize),
  })

  sceneDocumentActions.setHistory(nextHistory)

  return true
}

export function addFurniture(catalogId: string): AddFurnitureResult {
  // An add mid-drag would interleave history commits with the drag's coalesced
  // writes (ghost undo state) and retarget the selection mid-gesture.
  if (useSceneSessionStore.getState().isDragging) {
    return { ok: false, reason: 'dragging' }
  }

  const { history, instanceIdCounter, roomSize } =
    useSceneDocumentStore.getState()
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
    bounds: getRoomLayoutBounds(roomSize),
    edgeSnapThreshold: FURNITURE_EDGE_SNAP_THRESHOLD_METERS,
    snapSize: FURNITURE_SNAP_SIZE_METERS,
  })

  sceneDocumentActions.setHistory(operationResult.history)

  if (operationResult.incrementInstanceId) {
    sceneDocumentActions.setInstanceIdCounter(instanceIdCounter + 1)
    applySelection(operationResult.result.ok ? operationResult.result.id : null)
  }

  return operationResult.result
}
