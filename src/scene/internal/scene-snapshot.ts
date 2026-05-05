import { Box3, type Camera, type Object3D, Vector3 } from 'three'
import type { FurnitureItem } from '../objects/furniture.types'

export interface SceneSnapshotItem {
  id: string
  catalogId: string
  name: string
  position: [number, number, number]
  rotationY: number
  pointerTarget: {
    x: number
    y: number
  } | null
}

export interface SceneSnapshot {
  selectedId: string | null
  selectedName: string | null
  itemCount: number
  items: SceneSnapshotItem[]
}

interface PointerTargetOptions {
  object: Object3D | null
  camera: Camera
  canvasSize: { width: number; height: number }
}

function roundToPrecision(value: number, precision: number) {
  const factor = 10 ** precision

  return Math.round(value * factor) / factor
}

function getPointerTargetForObject({
  object,
  camera,
  canvasSize,
}: PointerTargetOptions) {
  if (!object) {
    return null
  }

  object.updateWorldMatrix(true, true)

  const projectedPoint = new Vector3()
  const bounds = new Box3().setFromObject(object)

  if (bounds.isEmpty()) {
    projectedPoint.setFromMatrixPosition(object.matrixWorld)
  } else {
    bounds.getCenter(projectedPoint)
  }

  projectedPoint.project(camera)

  if (
    !Number.isFinite(projectedPoint.x) ||
    !Number.isFinite(projectedPoint.y) ||
    !Number.isFinite(projectedPoint.z)
  ) {
    return null
  }

  return {
    x: roundToPrecision((projectedPoint.x * 0.5 + 0.5) * canvasSize.width, 3),
    y: roundToPrecision((-projectedPoint.y * 0.5 + 0.5) * canvasSize.height, 3),
  }
}

export function createSceneSnapshot(
  furniture: FurnitureItem[],
  selectedId: string | null,
  objectRefs: Map<string, Object3D>,
  camera: Camera,
  canvasSize: { width: number; height: number },
): SceneSnapshot {
  const selectedFurniture = selectedId
    ? (furniture.find((item) => item.id === selectedId) ?? null)
    : null

  return {
    selectedId,
    selectedName: selectedFurniture?.name ?? null,
    itemCount: furniture.length,
    items: furniture.map((item) => ({
      id: item.id,
      catalogId: item.catalogId,
      name: item.name,
      position: item.position.map((coordinate) => {
        return roundToPrecision(coordinate, 3)
      }) as [number, number, number],
      rotationY: roundToPrecision(item.rotationY, 6),
      pointerTarget: getPointerTargetForObject({
        object: objectRefs.get(item.id) ?? null,
        camera,
        canvasSize,
      }),
    })),
  }
}
