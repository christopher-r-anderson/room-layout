import { Box3, type Camera, type Object3D, Vector3 } from 'three'
import type { ScreenPoint, SelectedToolbarGeometry } from '../scene.types'
import { getMeshes } from '@/lib/three/get-meshes'
import { getVisualObjectBounds } from '@/lib/three/get-visual-object-bounds'
import { isUiBoundsObject } from '@/lib/three/ui-bounds'

const PROJECTED_POINT = new Vector3()
const WORLD_POINT = new Vector3()

function projectWorldPoint(
  point: Vector3,
  camera: Camera,
  canvasSize: { width: number; height: number },
) {
  PROJECTED_POINT.copy(point).project(camera)

  if (
    !Number.isFinite(PROJECTED_POINT.x) ||
    !Number.isFinite(PROJECTED_POINT.y) ||
    !Number.isFinite(PROJECTED_POINT.z)
  ) {
    return { ok: false as const, reason: 'non-finite-projection' as const }
  }

  if (PROJECTED_POINT.z < -1 || PROJECTED_POINT.z > 1) {
    return { ok: false as const, reason: 'behind-camera' as const }
  }

  return {
    ok: true as const,
    point: {
      x: (PROJECTED_POINT.x * 0.5 + 0.5) * canvasSize.width,
      y: (-PROJECTED_POINT.y * 0.5 + 0.5) * canvasSize.height,
    },
  }
}

function getBoxCorners(bounds: Box3) {
  const { min, max } = bounds

  return [
    new Vector3(min.x, min.y, min.z),
    new Vector3(max.x, min.y, min.z),
    new Vector3(min.x, max.y, min.z),
    new Vector3(max.x, max.y, min.z),
    new Vector3(min.x, min.y, max.z),
    new Vector3(max.x, min.y, max.z),
    new Vector3(min.x, max.y, max.z),
    new Vector3(max.x, max.y, max.z),
  ]
}

function collectUiBoundsPoints(object: Object3D) {
  const points: Vector3[] = []

  for (const mesh of getMeshes(object, { includeUiBounds: true })) {
    if (!isUiBoundsObject(mesh)) {
      continue
    }

    const position = mesh.geometry.attributes.position

    for (let index = 0; index < position.count; index += 1) {
      WORLD_POINT.fromBufferAttribute(position, index)
      WORLD_POINT.applyMatrix4(mesh.matrixWorld)
      points.push(WORLD_POINT.clone())
    }
  }

  return points
}

function projectPoints(
  points: Vector3[],
  camera: Camera,
  canvasSize: { width: number; height: number },
) {
  const screenPoints: ScreenPoint[] = []
  let rejectionReason:
    | 'non-finite-projection'
    | 'behind-camera'
    | 'no-placement-points' = 'no-placement-points'

  for (const point of points) {
    const result = projectWorldPoint(point, camera, canvasSize)
    if (!result.ok) {
      rejectionReason = result.reason
      continue
    }

    screenPoints.push(result.point)
  }

  return {
    points: screenPoints,
    sourcePointCount: points.length,
    projectedPointCount: screenPoints.length,
    rejectionReason,
  }
}

export function computeSelectedToolbarGeometry({
  canvasSize,
  camera,
  object,
  selectedId,
}: {
  canvasSize: { width: number; height: number }
  camera: Camera
  object: Object3D | null
  selectedId: string | null
}): SelectedToolbarGeometry {
  if (!selectedId) {
    return {
      kind: 'unavailable',
      selectedId: null,
      reason: 'no-selection',
    }
  }

  if (!object) {
    return {
      kind: 'unavailable',
      selectedId,
      reason: 'object-not-ready',
    }
  }

  object.updateWorldMatrix(true, true)

  const uiBoundsPoints = collectUiBoundsPoints(object)
  if (uiBoundsPoints.length > 0) {
    const projectedUiBounds = projectPoints(uiBoundsPoints, camera, canvasSize)

    if (projectedUiBounds.points.length > 0) {
      const firstUiBoundsMesh = getMeshes(object, {
        includeUiBounds: true,
      }).find((mesh) => isUiBoundsObject(mesh))

      return {
        kind: 'available',
        selectedId,
        source: 'ui-bounds-node',
        sourceNodeName: firstUiBoundsMesh?.name,
        canvasSize,
        sourcePointCount: projectedUiBounds.sourcePointCount,
        projectedPointCount: projectedUiBounds.projectedPointCount,
        points: projectedUiBounds.points,
      }
    }
  }

  const renderBounds = getVisualObjectBounds(object)
  if (renderBounds) {
    const projectedRenderBounds = projectPoints(
      getBoxCorners(renderBounds),
      camera,
      canvasSize,
    )

    if (projectedRenderBounds.points.length > 0) {
      return {
        kind: 'available',
        selectedId,
        source: 'render-bounds',
        canvasSize,
        sourcePointCount: projectedRenderBounds.sourcePointCount,
        projectedPointCount: projectedRenderBounds.projectedPointCount,
        points: projectedRenderBounds.points,
      }
    }

    return {
      kind: 'unavailable',
      selectedId,
      reason: projectedRenderBounds.rejectionReason,
    }
  }

  WORLD_POINT.setFromMatrixPosition(object.matrixWorld)
  const projectedObjectOrigin = projectWorldPoint(
    WORLD_POINT,
    camera,
    canvasSize,
  )

  if (projectedObjectOrigin.ok) {
    return {
      kind: 'available',
      selectedId,
      source: 'object-origin',
      canvasSize,
      sourcePointCount: 1,
      projectedPointCount: 1,
      points: [projectedObjectOrigin.point],
    }
  }

  return {
    kind: 'unavailable',
    selectedId,
    reason: projectedObjectOrigin.reason,
  }
}
