import type { FootprintSize } from '@/scene/objects/furniture.types'

const EPSILON = 1e-6

export interface FootprintPoint {
  x: number
  z: number
}

export interface FurnitureFootprint {
  centerX: number
  centerZ: number
  rotationY: number
  size: FootprintSize
}

export interface FootprintBounds {
  minX: number
  maxX: number
  minZ: number
  maxZ: number
}

export interface EdgeSnapDelta {
  x: number
  z: number
}

interface ProjectionRange {
  min: number
  max: number
}

interface EdgeSnapScratch {
  translatedMovingCorners: [
    FootprintPoint,
    FootprintPoint,
    FootprintPoint,
    FootprintPoint,
  ]
  movingRanges: [
    ProjectionRange,
    ProjectionRange,
    ProjectionRange,
    ProjectionRange,
  ]
  targetRanges: [
    ProjectionRange,
    ProjectionRange,
    ProjectionRange,
    ProjectionRange,
  ]
  translatedRanges: [
    ProjectionRange,
    ProjectionRange,
    ProjectionRange,
    ProjectionRange,
  ]
}

function getHalfExtents(size: FootprintSize) {
  return {
    halfWidth: size.width / 2,
    halfDepth: size.depth / 2,
  }
}

function rotatePoint(
  point: FootprintPoint,
  angleRadians: number,
): FootprintPoint {
  const cos = Math.cos(angleRadians)
  const sin = Math.sin(angleRadians)

  return {
    x: point.x * cos - point.z * sin,
    z: point.x * sin + point.z * cos,
  }
}

function subtractPoint(a: FootprintPoint, b: FootprintPoint): FootprintPoint {
  return {
    x: a.x - b.x,
    z: a.z - b.z,
  }
}

function normalize(point: FootprintPoint): FootprintPoint {
  const length = Math.hypot(point.x, point.z)

  if (length <= EPSILON) {
    return { x: 0, z: 0 }
  }

  return {
    x: point.x / length,
    z: point.z / length,
  }
}

function dot(a: FootprintPoint, b: FootprintPoint) {
  return a.x * b.x + a.z * b.z
}

function scalePoint(point: FootprintPoint, scalar: number): FootprintPoint {
  return {
    x: point.x * scalar,
    z: point.z * scalar,
  }
}

function createProjectionRange(): ProjectionRange {
  return {
    min: Number.POSITIVE_INFINITY,
    max: Number.NEGATIVE_INFINITY,
  }
}

function createEdgeSnapScratch(): EdgeSnapScratch {
  return {
    translatedMovingCorners: [
      { x: 0, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: 0 },
      { x: 0, z: 0 },
    ],
    movingRanges: [
      createProjectionRange(),
      createProjectionRange(),
      createProjectionRange(),
      createProjectionRange(),
    ],
    targetRanges: [
      createProjectionRange(),
      createProjectionRange(),
      createProjectionRange(),
      createProjectionRange(),
    ],
    translatedRanges: [
      createProjectionRange(),
      createProjectionRange(),
      createProjectionRange(),
      createProjectionRange(),
    ],
  }
}

const edgeSnapScratch = createEdgeSnapScratch()

function getProjectionRange(points: FootprintPoint[], axis: FootprintPoint) {
  const range = createProjectionRange()
  fillProjectionRange(points, axis, range)

  return range
}

function fillProjectionRange(
  points: FootprintPoint[],
  axis: FootprintPoint,
  range: ProjectionRange,
) {
  range.min = Number.POSITIVE_INFINITY
  range.max = Number.NEGATIVE_INFINITY

  for (const point of points) {
    const projection = dot(point, axis)
    range.min = Math.min(range.min, projection)
    range.max = Math.max(range.max, projection)
  }
}

function rangesOverlap(
  a: { min: number; max: number },
  b: { min: number; max: number },
  epsilon: number,
) {
  return a.max > b.min + epsilon && b.max > a.min + epsilon
}

function getRectAxes(corners: FootprintPoint[]) {
  return [
    normalize(subtractPoint(corners[1], corners[0])),
    normalize(subtractPoint(corners[3], corners[0])),
  ]
}

function getRangeGap(a: ProjectionRange, b: ProjectionRange) {
  if (a.max < b.min) {
    return b.min - a.max
  }

  if (b.max < a.min) {
    return a.min - b.max
  }

  return 0
}

function rangesTouchOrOverlap(
  a: ProjectionRange,
  b: ProjectionRange,
  epsilon: number,
) {
  return a.max >= b.min - epsilon && b.max >= a.min - epsilon
}

function fillTranslatedCorners(
  corners: [FootprintPoint, FootprintPoint, FootprintPoint, FootprintPoint],
  delta: FootprintPoint,
  target: [FootprintPoint, FootprintPoint, FootprintPoint, FootprintPoint],
) {
  for (let index = 0; index < corners.length; index += 1) {
    const corner = corners[index]
    const translatedCorner = target[index]
    translatedCorner.x = corner.x + delta.x
    translatedCorner.z = corner.z + delta.z
  }
}

export function getFootprintCorners(
  footprint: FurnitureFootprint,
): [FootprintPoint, FootprintPoint, FootprintPoint, FootprintPoint] {
  const { halfWidth, halfDepth } = getHalfExtents(footprint.size)

  const localCorners: [
    FootprintPoint,
    FootprintPoint,
    FootprintPoint,
    FootprintPoint,
  ] = [
    { x: -halfWidth, z: -halfDepth },
    { x: halfWidth, z: -halfDepth },
    { x: halfWidth, z: halfDepth },
    { x: -halfWidth, z: halfDepth },
  ]

  return localCorners.map((corner) => {
    const rotated = rotatePoint(corner, footprint.rotationY)

    return {
      x: rotated.x + footprint.centerX,
      z: rotated.z + footprint.centerZ,
    }
  }) as [FootprintPoint, FootprintPoint, FootprintPoint, FootprintPoint]
}

export function getFootprintBounds(
  footprint: FurnitureFootprint,
): FootprintBounds {
  const corners = getFootprintCorners(footprint)

  return {
    minX: Math.min(...corners.map((corner) => corner.x)),
    maxX: Math.max(...corners.map((corner) => corner.x)),
    minZ: Math.min(...corners.map((corner) => corner.z)),
    maxZ: Math.max(...corners.map((corner) => corner.z)),
  }
}

export function footprintsOverlap(
  a: FurnitureFootprint,
  b: FurnitureFootprint,
  epsilon = EPSILON,
) {
  const aCorners = getFootprintCorners(a)
  const bCorners = getFootprintCorners(b)

  const axes = [...getRectAxes(aCorners), ...getRectAxes(bCorners)]

  for (const axis of axes) {
    const aProjection = getProjectionRange(aCorners, axis)
    const bProjection = getProjectionRange(bCorners, axis)

    if (!rangesOverlap(aProjection, bProjection, epsilon)) {
      return false
    }
  }

  return true
}

export function getEdgeSnapDelta(
  moving: FurnitureFootprint,
  target: FurnitureFootprint,
  threshold: number,
): EdgeSnapDelta | null {
  if (threshold <= 0) {
    return null
  }

  const movingCorners = getFootprintCorners(moving)
  const targetCorners = getFootprintCorners(target)
  const axes = [...getRectAxes(movingCorners), ...getRectAxes(targetCorners)]
  const {
    translatedMovingCorners,
    movingRanges,
    targetRanges,
    translatedRanges,
  } = edgeSnapScratch

  for (let index = 0; index < axes.length; index += 1) {
    const axis = axes[index]
    fillProjectionRange(movingCorners, axis, movingRanges[index])
    fillProjectionRange(targetCorners, axis, targetRanges[index])
  }

  let bestDelta: EdgeSnapDelta | null = null
  let bestDistance = Number.POSITIVE_INFINITY

  for (let axisIndex = 0; axisIndex < axes.length; axisIndex += 1) {
    const axis = axes[axisIndex]
    const movingRange = movingRanges[axisIndex]
    const targetRange = targetRanges[axisIndex]

    const axisCandidates = [
      targetRange.min - movingRange.max,
      targetRange.max - movingRange.min,
    ]

    for (const candidateScalar of axisCandidates) {
      if (Math.abs(candidateScalar) <= EPSILON) {
        continue
      }

      if (Math.abs(candidateScalar) > threshold) {
        continue
      }

      const deltaVector = scalePoint(axis, candidateScalar)
      fillTranslatedCorners(movingCorners, deltaVector, translatedMovingCorners)

      let alignsOnAllAxes = true

      for (
        let validationIndex = 0;
        validationIndex < axes.length;
        validationIndex += 1
      ) {
        const validationAxis = axes[validationIndex]
        const translatedRange = translatedRanges[validationIndex]
        const stationaryRange = targetRanges[validationIndex]

        fillProjectionRange(
          translatedMovingCorners,
          validationAxis,
          translatedRange,
        )

        if (
          !rangesTouchOrOverlap(translatedRange, stationaryRange, threshold) &&
          getRangeGap(translatedRange, stationaryRange) > threshold
        ) {
          alignsOnAllAxes = false
          break
        }
      }

      if (!alignsOnAllAxes) {
        continue
      }

      const candidateDistance = Math.hypot(deltaVector.x, deltaVector.z)

      if (candidateDistance < bestDistance) {
        bestDistance = candidateDistance
        bestDelta = {
          x: deltaVector.x,
          z: deltaVector.z,
        }
      }
    }
  }

  return bestDelta
}
