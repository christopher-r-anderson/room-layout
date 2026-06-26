// Generic 2D geometry: convex hull and contour (silhouette-edge) queries over
// screen points. No toolbar or domain knowledge — just points, hulls, and
// rectangles — so it reads and tests as a standalone computational-geometry
// util that the placement engine happens to consume.
import {
  getRectBottom,
  getRectCorners,
  getRectRight,
  type Rect,
} from './rect-utils'

export interface ScreenPoint {
  x: number
  y: number
}

export interface PointBounds extends Rect {
  right: number
  bottom: number
  centerX: number
  centerY: number
}

function crossProduct(
  origin: ScreenPoint,
  left: ScreenPoint,
  right: ScreenPoint,
) {
  return (
    (left.x - origin.x) * (right.y - origin.y) -
    (left.y - origin.y) * (right.x - origin.x)
  )
}

export function getConvexHull(points: ScreenPoint[]) {
  if (points.length <= 1) {
    return points
  }

  const sortedPoints = [...points].sort((left, right) => {
    if (left.x === right.x) {
      return left.y - right.y
    }

    return left.x - right.x
  })
  const uniquePoints = sortedPoints.filter((point, index) => {
    if (index === 0) {
      return true
    }

    const previousPoint = sortedPoints[index - 1]

    return previousPoint.x !== point.x || previousPoint.y !== point.y
  })

  if (uniquePoints.length <= 2) {
    return uniquePoints
  }

  const lowerHull: ScreenPoint[] = []
  for (const point of uniquePoints) {
    while (
      lowerHull.length >= 2 &&
      crossProduct(
        lowerHull[lowerHull.length - 2],
        lowerHull[lowerHull.length - 1],
        point,
      ) <= 0
    ) {
      lowerHull.pop()
    }

    lowerHull.push(point)
  }

  const upperHull: ScreenPoint[] = []
  for (const point of [...uniquePoints].reverse()) {
    while (
      upperHull.length >= 2 &&
      crossProduct(
        upperHull[upperHull.length - 2],
        upperHull[upperHull.length - 1],
        point,
      ) <= 0
    ) {
      upperHull.pop()
    }

    upperHull.push(point)
  }

  lowerHull.pop()
  upperHull.pop()

  return [...lowerHull, ...upperHull]
}

function pointInRect(point: ScreenPoint, rect: Rect) {
  return (
    point.x >= rect.left &&
    point.x <= getRectRight(rect) &&
    point.y >= rect.top &&
    point.y <= getRectBottom(rect)
  )
}

function pointInPolygon(point: ScreenPoint, polygon: ScreenPoint[]) {
  let isInside = false

  for (
    let currentIndex = 0, previousIndex = polygon.length - 1;
    currentIndex < polygon.length;
    previousIndex = currentIndex, currentIndex += 1
  ) {
    const currentPoint = polygon[currentIndex]
    const previousPoint = polygon[previousIndex]
    const intersectsRay =
      currentPoint.y > point.y !== previousPoint.y > point.y &&
      point.x <
        ((previousPoint.x - currentPoint.x) * (point.y - currentPoint.y)) /
          (previousPoint.y - currentPoint.y) +
          currentPoint.x

    if (intersectsRay) {
      isInside = !isInside
    }
  }

  return isInside
}

function orientation(
  left: ScreenPoint,
  center: ScreenPoint,
  right: ScreenPoint,
) {
  const value =
    (center.y - left.y) * (right.x - center.x) -
    (center.x - left.x) * (right.y - center.y)

  if (Math.abs(value) < 1e-6) {
    return 0
  }

  return value > 0 ? 1 : 2
}

function onSegment(left: ScreenPoint, point: ScreenPoint, right: ScreenPoint) {
  return (
    point.x <= Math.max(left.x, right.x) &&
    point.x >= Math.min(left.x, right.x) &&
    point.y <= Math.max(left.y, right.y) &&
    point.y >= Math.min(left.y, right.y)
  )
}

function segmentsIntersect(
  firstStart: ScreenPoint,
  firstEnd: ScreenPoint,
  secondStart: ScreenPoint,
  secondEnd: ScreenPoint,
) {
  const firstOrientation = orientation(firstStart, firstEnd, secondStart)
  const secondOrientation = orientation(firstStart, firstEnd, secondEnd)
  const thirdOrientation = orientation(secondStart, secondEnd, firstStart)
  const fourthOrientation = orientation(secondStart, secondEnd, firstEnd)

  if (
    firstOrientation !== secondOrientation &&
    thirdOrientation !== fourthOrientation
  ) {
    return true
  }

  if (firstOrientation === 0 && onSegment(firstStart, secondStart, firstEnd)) {
    return true
  }

  if (secondOrientation === 0 && onSegment(firstStart, secondEnd, firstEnd)) {
    return true
  }

  if (thirdOrientation === 0 && onSegment(secondStart, firstStart, secondEnd)) {
    return true
  }

  return fourthOrientation === 0 && onSegment(secondStart, firstEnd, secondEnd)
}

export function rectIntersectsPolygon(rect: Rect, polygon: ScreenPoint[]) {
  if (polygon.length === 0) {
    return false
  }

  if (polygon.some((point) => pointInRect(point, rect))) {
    return true
  }

  const rectCorners = getRectCorners(rect)
  if (rectCorners.some((point) => pointInPolygon(point, polygon))) {
    return true
  }

  const rectEdges = rectCorners.map((point, index) => [
    point,
    rectCorners[(index + 1) % rectCorners.length],
  ])

  return polygon.some((point, index) => {
    const nextPoint = polygon[(index + 1) % polygon.length]

    return rectEdges.some(([rectStart, rectEnd]) =>
      segmentsIntersect(rectStart, rectEnd, point, nextPoint),
    )
  })
}

function getLineIntersectionAtY(
  left: ScreenPoint,
  right: ScreenPoint,
  y: number,
) {
  if (left.y === right.y) {
    if (left.y !== y) {
      return []
    }

    return [left.x, right.x]
  }

  const minY = Math.min(left.y, right.y)
  const maxY = Math.max(left.y, right.y)
  if (y < minY || y > maxY) {
    return []
  }

  const progress = (y - left.y) / (right.y - left.y)
  return [left.x + (right.x - left.x) * progress]
}

function getLineIntersectionAtX(
  left: ScreenPoint,
  right: ScreenPoint,
  x: number,
) {
  if (left.x === right.x) {
    if (left.x !== x) {
      return []
    }

    return [left.y, right.y]
  }

  const minX = Math.min(left.x, right.x)
  const maxX = Math.max(left.x, right.x)
  if (x < minX || x > maxX) {
    return []
  }

  const progress = (x - left.x) / (right.x - left.x)
  return [left.y + (right.y - left.y) * progress]
}

export function getContourXAtY(
  polygon: ScreenPoint[],
  y: number,
  side: 'left' | 'right',
) {
  const intersections = polygon.flatMap((point, index) =>
    getLineIntersectionAtY(point, polygon[(index + 1) % polygon.length], y),
  )

  if (intersections.length === 0) {
    return null
  }

  return side === 'left'
    ? Math.min(...intersections)
    : Math.max(...intersections)
}

export function getContourYAtX(
  polygon: ScreenPoint[],
  x: number,
  side: 'top' | 'bottom',
) {
  const intersections = polygon.flatMap((point, index) =>
    getLineIntersectionAtX(point, polygon[(index + 1) % polygon.length], x),
  )

  if (intersections.length === 0) {
    return null
  }

  return side === 'top'
    ? Math.min(...intersections)
    : Math.max(...intersections)
}

export function getContourXInYRange(
  polygon: ScreenPoint[],
  top: number,
  bottom: number,
  side: 'left' | 'right',
) {
  const values = [
    getContourXAtY(polygon, top, side),
    getContourXAtY(polygon, bottom, side),
    ...polygon
      .filter((point) => point.y >= top && point.y <= bottom)
      .map((point) => point.x),
  ].filter((value): value is number => value !== null)

  if (values.length === 0) {
    return null
  }

  return side === 'left' ? Math.min(...values) : Math.max(...values)
}

export function getContourYInXRange(
  polygon: ScreenPoint[],
  left: number,
  right: number,
  side: 'top' | 'bottom',
) {
  const values = [
    getContourYAtX(polygon, left, side),
    getContourYAtX(polygon, right, side),
    ...polygon
      .filter((point) => point.x >= left && point.x <= right)
      .map((point) => point.y),
  ].filter((value): value is number => value !== null)

  if (values.length === 0) {
    return null
  }

  return side === 'top' ? Math.min(...values) : Math.max(...values)
}

export function getPointBounds(points: ScreenPoint[]): PointBounds | null {
  if (points.length === 0) {
    return null
  }

  const left = Math.min(...points.map((point) => point.x))
  const top = Math.min(...points.map((point) => point.y))
  const right = Math.max(...points.map((point) => point.x))
  const bottom = Math.max(...points.map((point) => point.y))
  const width = right - left
  const height = bottom - top

  return {
    left,
    top,
    right,
    bottom,
    width,
    height,
    centerX: left + width / 2,
    centerY: top + height / 2,
  }
}
