import { type Camera, type Object3D, Vector3 } from 'three'
import type { FurnitureItem } from '@/domain/furniture'
import type { SceneSnapshot } from '@/core/scene.types'
import { getVisualObjectBounds } from '@/scene/internal/three/get-visual-object-bounds'

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
  const bounds = getVisualObjectBounds(object)

  if (!bounds) {
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

  if (
    projectedPoint.x < -1 ||
    projectedPoint.x > 1 ||
    projectedPoint.y < -1 ||
    projectedPoint.y > 1 ||
    projectedPoint.z < -1 ||
    projectedPoint.z > 1
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
  objectRefs: Map<string, Object3D>,
  camera: Camera,
  canvasSize: { width: number; height: number },
): SceneSnapshot {
  return {
    cameraPosition: camera.position.toArray().map((coordinate) => {
      return roundToPrecision(coordinate, 3)
    }) as [number, number, number],
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
