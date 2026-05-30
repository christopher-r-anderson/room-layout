export interface ScreenPoint {
  x: number
  y: number
}

export type ToolbarGeometrySource =
  | 'ui-bounds-node'
  | 'render-bounds'
  | 'object-origin'

export type ToolbarPlacementMode = 'hidden' | 'floating' | 'docked'
export type ToolbarSide = 'top' | 'bottom' | 'left' | 'right' | 'docked'
export type ToolbarFloatingCandidateId =
  | 'top-center'
  | 'top-left'
  | 'top-right'
  | 'bottom-center'
  | 'bottom-left'
  | 'bottom-right'
  | 'right-center'
  | 'right-upper'
  | 'right-lower'
  | 'left-center'
  | 'left-upper'
  | 'left-lower'

export interface ToolbarPlacement {
  mode: ToolbarPlacementMode
  left: number
  top: number
  side: ToolbarSide
  source?: ToolbarGeometrySource
  candidateId?: ToolbarFloatingCandidateId
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

interface PointBounds extends Rect {
  right: number
  bottom: number
  centerX: number
  centerY: number
}

interface FloatingCandidate {
  id: ToolbarFloatingCandidateId
  side: Exclude<ToolbarSide, 'docked'>
  anchor: ScreenPoint
  idealRect: Rect
  adjustedRect: Rect
  clampShift: number
  attachmentDistance: number
  score: number
}

interface CandidateAnchorDefinition {
  id: ToolbarFloatingCandidateId
  side: Exclude<ToolbarSide, 'docked'>
  axisRatio: number
}

const VIEWPORT_PADDING = 12 // Minimum gap from the room-view edges.
const TOOLBAR_GAP = 12 // Visual offset between the object contour and toolbar.
const SUPPORT_BAND_TOLERANCE = 16 // How much point spread still counts as one visible edge.
const OBJECT_CLEARANCE_GAP = 8 // Soft spacing penalty around the selected footprint.
const MIN_PROJECTED_POINT_COUNT = 3 // Fewer projected points reads as unreliable geometry.
const MIN_PROJECTED_BOUNDS_SIZE = 24 // Tiny projected bounds are treated as noise.
const MIN_RENDER_PROJECTED_RATIO = 0.5 // Render bounds need at least half their points visible.
const MIN_UI_BOUNDS_PROJECTED_RATIO = 0.15 // Authored UI bounds can survive with less visible coverage.
const MIN_VISIBLE_BOUNDS_RATIO = 0.2 // Dock if too little of the projected bounds is on screen.
const MAX_BOUNDS_CONTAINER_SCALE = 1.5 // Reject implausibly oversized projected bounds.
const MAX_CROSS_AXIS_CLAMP_SHIFT = 72 // Reject candidates that need too much sideways nudging.
const MAX_ATTACHMENT_DISTANCE = 120 // Reject candidates that feel too detached from the object.
const HYSTERESIS_SCORE_DELTA = 24 // Keep the previous floating side unless another is clearly better.
const MAX_FLOATING_SCORE = 140 // Dock when every floating option is a poor fit.
const DIAGONAL_SIDE_BIAS_START = 0.7 // Only strongly diagonal, elongated shapes get side bias.
const DIAGONAL_SIDE_BIAS_TOP_PENALTY = 28 // Raise to make diagonal shapes leave top sooner.
const DIAGONAL_SIDE_BIAS_BOTTOM_PENALTY = 18 // Bottom stays slightly less preferred than top.
const DIAGONAL_SIDE_BIAS_SIDE_REWARD = 48 // Raise to make strong diagonals favor sides more often.

const CANDIDATE_ANCHOR_DEFINITIONS: CandidateAnchorDefinition[] = [
  { id: 'top-center', side: 'top', axisRatio: 0.5 },
  { id: 'top-left', side: 'top', axisRatio: 0.25 },
  { id: 'top-right', side: 'top', axisRatio: 0.75 },
  { id: 'bottom-center', side: 'bottom', axisRatio: 0.5 },
  { id: 'bottom-left', side: 'bottom', axisRatio: 0.25 },
  { id: 'bottom-right', side: 'bottom', axisRatio: 0.75 },
  { id: 'right-center', side: 'right', axisRatio: 0.5 },
  { id: 'right-upper', side: 'right', axisRatio: 0.25 },
  { id: 'right-lower', side: 'right', axisRatio: 0.75 },
  { id: 'left-center', side: 'left', axisRatio: 0.5 },
  { id: 'left-upper', side: 'left', axisRatio: 0.25 },
  { id: 'left-lower', side: 'left', axisRatio: 0.75 },
]

function getRectRight(rect: Pick<Rect, 'left' | 'width'>) {
  return rect.left + rect.width
}

function getRectBottom(rect: Pick<Rect, 'top' | 'height'>) {
  return rect.top + rect.height
}

function getDomRectRight(rect: DOMRectReadOnly) {
  return rect.right || rect.left + rect.width
}

function getDomRectBottom(rect: DOMRectReadOnly) {
  return rect.bottom || rect.top + rect.height
}

function intersects(left: Rect, right: Rect) {
  return !(
    getRectRight(left) <= right.left ||
    getRectRight(right) <= left.left ||
    getRectBottom(left) <= right.top ||
    getRectBottom(right) <= left.top
  )
}

function clamp(value: number, min: number, max: number) {
  if (min > max) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

function fitsContainer(rect: Rect, containerRect: DOMRectReadOnly) {
  return (
    rect.left >= containerRect.left + VIEWPORT_PADDING &&
    rect.top >= containerRect.top + VIEWPORT_PADDING &&
    getRectRight(rect) <= getDomRectRight(containerRect) - VIEWPORT_PADDING &&
    getRectBottom(rect) <= getDomRectBottom(containerRect) - VIEWPORT_PADDING
  )
}

function getContainerRect(containerRect: DOMRectReadOnly): Rect {
  return {
    left: containerRect.left,
    top: containerRect.top,
    width: containerRect.width,
    height: containerRect.height,
  }
}

function toAbsoluteRect(rect: DOMRectReadOnly): Rect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

function avoidsExclusions(rect: Rect, exclusionRects: Rect[]) {
  return !exclusionRects.some((exclusionRect) =>
    intersects(rect, exclusionRect),
  )
}

function createRect(
  left: number,
  top: number,
  toolbarSize: { width: number; height: number },
): Rect {
  return {
    left,
    top,
    width: toolbarSize.width,
    height: toolbarSize.height,
  }
}

function getRectIntersectionArea(left: Rect, right: Rect) {
  const overlapWidth = Math.max(
    0,
    Math.min(getRectRight(left), getRectRight(right)) -
      Math.max(left.left, right.left),
  )
  const overlapHeight = Math.max(
    0,
    Math.min(getRectBottom(left), getRectBottom(right)) -
      Math.max(left.top, right.top),
  )

  return overlapWidth * overlapHeight
}

function getRectDistance(left: Rect, right: Rect) {
  const horizontalGap = Math.max(
    right.left - getRectRight(left),
    left.left - getRectRight(right),
    0,
  )
  const verticalGap = Math.max(
    right.top - getRectBottom(left),
    left.top - getRectBottom(right),
    0,
  )

  return Math.hypot(horizontalGap, verticalGap)
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

function getConvexHull(points: ScreenPoint[]) {
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

function getRectCorners(rect: Rect): ScreenPoint[] {
  return [
    { x: rect.left, y: rect.top },
    { x: getRectRight(rect), y: rect.top },
    { x: getRectRight(rect), y: getRectBottom(rect) },
    { x: rect.left, y: getRectBottom(rect) },
  ]
}

function rectIntersectsPolygon(rect: Rect, polygon: ScreenPoint[]) {
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

function getContourXAtY(
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

function getContourYAtX(
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

function getContourXInYRange(
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

function getContourYInXRange(
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

function getPointBounds(points: ScreenPoint[]): PointBounds | null {
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

function inflateRect(rect: Rect, amount: number): Rect {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  }
}

function getAnchor(
  points: ScreenPoint[],
  side: Exclude<ToolbarSide, 'docked'>,
) {
  if (points.length === 0) {
    return null
  }

  if (side === 'top') {
    const minY = Math.min(...points.map((point) => point.y))
    const band = points.filter(
      (point) => point.y <= minY + SUPPORT_BAND_TOLERANCE,
    )
    return {
      x: band.reduce((sum, point) => sum + point.x, 0) / band.length,
      y: minY,
    }
  }

  if (side === 'bottom') {
    const maxY = Math.max(...points.map((point) => point.y))
    const band = points.filter(
      (point) => point.y >= maxY - SUPPORT_BAND_TOLERANCE,
    )
    return {
      x: band.reduce((sum, point) => sum + point.x, 0) / band.length,
      y: maxY,
    }
  }

  if (side === 'left') {
    const minX = Math.min(...points.map((point) => point.x))
    const band = points.filter(
      (point) => point.x <= minX + SUPPORT_BAND_TOLERANCE,
    )
    return {
      x: minX,
      y: band.reduce((sum, point) => sum + point.y, 0) / band.length,
    }
  }

  const maxX = Math.max(...points.map((point) => point.x))
  const band = points.filter(
    (point) => point.x >= maxX - SUPPORT_BAND_TOLERANCE,
  )
  return {
    x: maxX,
    y: band.reduce((sum, point) => sum + point.y, 0) / band.length,
  }
}

function createRectFromAnchor(
  anchor: ScreenPoint,
  hull: ScreenPoint[],
  side: Exclude<ToolbarSide, 'docked'>,
  toolbarSize: { width: number; height: number },
): Rect {
  if (side === 'top') {
    const left = anchor.x - toolbarSize.width / 2
    const right = left + toolbarSize.width
    const contourTop = getContourYInXRange(hull, left, right, 'top') ?? anchor.y

    return {
      left,
      top: contourTop - TOOLBAR_GAP - toolbarSize.height,
      width: toolbarSize.width,
      height: toolbarSize.height,
    }
  }

  if (side === 'bottom') {
    const left = anchor.x - toolbarSize.width / 2
    const right = left + toolbarSize.width
    const contourBottom =
      getContourYInXRange(hull, left, right, 'bottom') ?? anchor.y

    return {
      left,
      top: contourBottom + TOOLBAR_GAP,
      width: toolbarSize.width,
      height: toolbarSize.height,
    }
  }

  if (side === 'left') {
    const top = anchor.y - toolbarSize.height / 2
    const bottom = top + toolbarSize.height
    const contourLeft =
      getContourXInYRange(hull, top, bottom, 'left') ?? anchor.x

    return {
      left: contourLeft - TOOLBAR_GAP - toolbarSize.width,
      top,
      width: toolbarSize.width,
      height: toolbarSize.height,
    }
  }

  const top = anchor.y - toolbarSize.height / 2
  const bottom = top + toolbarSize.height
  const contourRight =
    getContourXInYRange(hull, top, bottom, 'right') ?? anchor.x

  return {
    left: contourRight + TOOLBAR_GAP,
    top,
    width: toolbarSize.width,
    height: toolbarSize.height,
  }
}

function adjustRectToContainer(
  rect: Rect,
  side: Exclude<ToolbarSide, 'docked'>,
  containerRect: DOMRectReadOnly,
) {
  if (side === 'top' || side === 'bottom') {
    const adjustedLeft = clamp(
      rect.left,
      containerRect.left + VIEWPORT_PADDING,
      getDomRectRight(containerRect) - rect.width - VIEWPORT_PADDING,
    )

    return {
      rect: {
        ...rect,
        left: adjustedLeft,
      },
      clampShift: Math.abs(adjustedLeft - rect.left),
    }
  }

  const adjustedTop = clamp(
    rect.top,
    containerRect.top + VIEWPORT_PADDING,
    getDomRectBottom(containerRect) - rect.height - VIEWPORT_PADDING,
  )

  return {
    rect: {
      ...rect,
      top: adjustedTop,
    },
    clampShift: Math.abs(adjustedTop - rect.top),
  }
}

function getAttachmentDistance(rect: Rect, anchor: ScreenPoint) {
  const rectCenterX = rect.left + rect.width / 2
  const rectCenterY = rect.top + rect.height / 2

  return Math.hypot(rectCenterX - anchor.x, rectCenterY - anchor.y)
}

function getDiagonalSidePreference(points: ScreenPoint[]) {
  if (points.length < 2) {
    return 0
  }

  const centerX =
    points.reduce((sum, point) => sum + point.x, 0) / points.length
  const centerY =
    points.reduce((sum, point) => sum + point.y, 0) / points.length
  const covariance = points.reduce(
    (result, point) => {
      const deltaX = point.x - centerX
      const deltaY = point.y - centerY

      return {
        xx: result.xx + deltaX * deltaX,
        yy: result.yy + deltaY * deltaY,
        xy: result.xy + deltaX * deltaY,
      }
    },
    { xx: 0, yy: 0, xy: 0 },
  )

  const pointCount = points.length
  const xx = covariance.xx / pointCount
  const yy = covariance.yy / pointCount
  const xy = covariance.xy / pointCount
  const trace = xx + yy
  const determinantComponent = Math.hypot(xx - yy, xy * 2)
  const dominantEigenvalue = (trace + determinantComponent) / 2
  const secondaryEigenvalue = Math.max(0, (trace - determinantComponent) / 2)

  if (dominantEigenvalue <= 0) {
    return 0
  }

  const elongation = Math.max(
    0,
    Math.min(1, 1 - secondaryEigenvalue / dominantEigenvalue),
  )
  const axisAngle = 0.5 * Math.atan2(xy * 2, xx - yy)
  const diagonalness = Math.abs(Math.sin(axisAngle * 2))

  // Strong bias needs both diagonal orientation and a long/narrow projected footprint.
  return diagonalness * (0.35 + elongation * 0.65)
}

function getDiagonalSideBiasStrength(diagonalSidePreference: number) {
  return clamp(
    (diagonalSidePreference - DIAGONAL_SIDE_BIAS_START) /
      (1 - DIAGONAL_SIDE_BIAS_START),
    0,
    1,
  )
}

function getSidePreferencePenalty(
  side: Exclude<ToolbarSide, 'docked'>,
  diagonalSidePreference: number,
) {
  const diagonalSideBiasStrength = getDiagonalSideBiasStrength(
    diagonalSidePreference,
  )

  if (side === 'top') {
    return diagonalSideBiasStrength * DIAGONAL_SIDE_BIAS_TOP_PENALTY
  }

  if (side === 'bottom') {
    return 20 + diagonalSideBiasStrength * DIAGONAL_SIDE_BIAS_BOTTOM_PENALTY
  }

  return 40 - diagonalSideBiasStrength * DIAGONAL_SIDE_BIAS_SIDE_REWARD
}

function getMinimumExclusionDistance(rect: Rect, exclusionRects: Rect[]) {
  if (exclusionRects.length === 0) {
    return 100
  }

  return Math.min(
    ...exclusionRects.map((exclusionRect) =>
      getRectDistance(rect, exclusionRect),
    ),
  )
}

function createFloatingCandidate(
  id: ToolbarFloatingCandidateId,
  side: Exclude<ToolbarSide, 'docked'>,
  anchor: ScreenPoint,
) {
  return {
    id,
    side,
    anchor,
  }
}

function resolveCandidateAnchor(
  definition: CandidateAnchorDefinition,
  bounds: PointBounds,
  hull: ScreenPoint[],
  anchors: Partial<Record<Exclude<ToolbarSide, 'docked'>, ScreenPoint>>,
) {
  const fallbackAnchor = anchors[definition.side]

  if (!fallbackAnchor) {
    return null
  }

  if (definition.side === 'top' || definition.side === 'bottom') {
    const x = bounds.left + bounds.width * definition.axisRatio

    return {
      x,
      y: getContourYAtX(hull, x, definition.side) ?? fallbackAnchor.y,
    }
  }

  const y = bounds.top + bounds.height * definition.axisRatio

  return {
    x: getContourXAtY(hull, y, definition.side) ?? fallbackAnchor.x,
    y,
  }
}

function getCandidateAnchors(points: ScreenPoint[], bounds: PointBounds) {
  const hull = getConvexHull(points)
  const anchors: Partial<Record<Exclude<ToolbarSide, 'docked'>, ScreenPoint>> =
    {
      top: getAnchor(points, 'top') ?? undefined,
      bottom: getAnchor(points, 'bottom') ?? undefined,
      left: getAnchor(points, 'left') ?? undefined,
      right: getAnchor(points, 'right') ?? undefined,
    }

  const resolvedAnchors = CANDIDATE_ANCHOR_DEFINITIONS.map((definition) => {
    const anchor = resolveCandidateAnchor(definition, bounds, hull, anchors)

    return anchor
      ? createFloatingCandidate(definition.id, definition.side, anchor)
      : null
  })

  return resolvedAnchors.every(Boolean)
    ? (resolvedAnchors as FloatingCandidate[])
    : []
}

function isLowConfidenceGeometry({
  bounds,
  containerRect,
  projectedPointCount,
  source,
  sourcePointCount,
}: {
  bounds: PointBounds
  containerRect: DOMRectReadOnly
  projectedPointCount?: number
  source?: ToolbarGeometrySource
  sourcePointCount?: number
}) {
  if (
    !Number.isFinite(bounds.left) ||
    !Number.isFinite(bounds.top) ||
    !Number.isFinite(bounds.width) ||
    !Number.isFinite(bounds.height)
  ) {
    return true
  }

  if (
    bounds.width < MIN_PROJECTED_BOUNDS_SIZE ||
    bounds.height < MIN_PROJECTED_BOUNDS_SIZE ||
    projectedPointCount === undefined ||
    projectedPointCount < MIN_PROJECTED_POINT_COUNT
  ) {
    return true
  }

  if (
    bounds.width > containerRect.width * MAX_BOUNDS_CONTAINER_SCALE ||
    bounds.height > containerRect.height * MAX_BOUNDS_CONTAINER_SCALE
  ) {
    return true
  }

  const boundsArea = bounds.width * bounds.height
  const visibleBoundsArea = getRectIntersectionArea(
    bounds,
    getContainerRect(containerRect),
  )
  if (
    boundsArea <= 0 ||
    visibleBoundsArea / boundsArea < MIN_VISIBLE_BOUNDS_RATIO
  ) {
    return true
  }

  if (!sourcePointCount || sourcePointCount <= 0) {
    return false
  }

  const projectedRatio = projectedPointCount / sourcePointCount
  if (source === 'render-bounds') {
    return projectedRatio < MIN_RENDER_PROJECTED_RATIO
  }

  if (source === 'ui-bounds-node') {
    return projectedRatio < MIN_UI_BOUNDS_PROJECTED_RATIO
  }

  return false
}

function scoreCandidate(
  candidate: Omit<FloatingCandidate, 'score'>,
  bounds: PointBounds,
  diagonalSidePreference: number,
  objectAvoidanceRect: Rect,
  exclusionRects: Rect[],
) {
  const rectCenterX =
    candidate.adjustedRect.left + candidate.adjustedRect.width / 2
  const rectCenterY =
    candidate.adjustedRect.top + candidate.adjustedRect.height / 2
  const compactnessDistance =
    candidate.side === 'top' || candidate.side === 'bottom'
      ? Math.abs(rectCenterX - bounds.centerX)
      : Math.abs(rectCenterY - bounds.centerY)
  const exclusionClearancePenalty = Math.max(
    0,
    48 -
      Math.min(
        48,
        getMinimumExclusionDistance(candidate.adjustedRect, exclusionRects),
      ),
  )
  const objectClearancePenalty = Math.max(
    0,
    24 -
      Math.min(
        24,
        getRectDistance(candidate.adjustedRect, objectAvoidanceRect),
      ),
  )

  return (
    getSidePreferencePenalty(candidate.side, diagonalSidePreference) +
    candidate.clampShift * 2 +
    candidate.attachmentDistance * 0.5 +
    compactnessDistance * 0.15 +
    exclusionClearancePenalty +
    objectClearancePenalty
  )
}

function createFloatingCandidates({
  bounds,
  containerRect,
  diagonalSidePreference,
  exclusionRects,
  hull,
  objectAvoidanceRect,
  points,
  previousFloatingCandidateId,
  toolbarSize,
}: {
  bounds: PointBounds
  containerRect: DOMRectReadOnly
  diagonalSidePreference: number
  exclusionRects: Rect[]
  hull: ScreenPoint[]
  objectAvoidanceRect: Rect
  points: ScreenPoint[]
  previousFloatingCandidateId?: ToolbarFloatingCandidateId
  toolbarSize: { width: number; height: number }
}) {
  const candidates = getCandidateAnchors(points, bounds)
    .map((candidate) => {
      const idealRect = createRectFromAnchor(
        candidate.anchor,
        hull,
        candidate.side,
        toolbarSize,
      )
      const adjusted = adjustRectToContainer(
        idealRect,
        candidate.side,
        containerRect,
      )
      const nextCandidate = {
        ...candidate,
        idealRect,
        adjustedRect: adjusted.rect,
        clampShift: adjusted.clampShift,
        attachmentDistance: getAttachmentDistance(
          adjusted.rect,
          candidate.anchor,
        ),
      }

      if (!fitsContainer(nextCandidate.adjustedRect, containerRect)) {
        return null
      }

      if (nextCandidate.clampShift > MAX_CROSS_AXIS_CLAMP_SHIFT) {
        return null
      }

      if (nextCandidate.attachmentDistance > MAX_ATTACHMENT_DISTANCE) {
        return null
      }

      if (!avoidsExclusions(nextCandidate.adjustedRect, exclusionRects)) {
        return null
      }

      if (rectIntersectsPolygon(nextCandidate.adjustedRect, hull)) {
        return null
      }

      return {
        ...nextCandidate,
        score: scoreCandidate(
          nextCandidate,
          bounds,
          diagonalSidePreference,
          objectAvoidanceRect,
          exclusionRects,
        ),
      }
    })
    .filter((candidate): candidate is FloatingCandidate => Boolean(candidate))

  if (candidates.length === 0) {
    return null
  }

  const sortedCandidates = [...candidates].sort(
    (left, right) => left.score - right.score,
  )
  const bestCandidate = sortedCandidates[0]
  const previousCandidate = previousFloatingCandidateId
    ? sortedCandidates.find(
        (candidate) => candidate.id === previousFloatingCandidateId,
      )
    : undefined

  if (
    previousCandidate &&
    previousCandidate.score <= bestCandidate.score + HYSTERESIS_SCORE_DELTA
  ) {
    return previousCandidate
  }

  return bestCandidate
}

function getFirstValidRect(
  candidates: Rect[],
  containerRect: DOMRectReadOnly,
  exclusionRects: Rect[],
) {
  return candidates.find(
    (candidate) =>
      fitsContainer(candidate, containerRect) &&
      avoidsExclusions(candidate, exclusionRects),
  )
}

function getDockedPlacement({
  containerRect,
  exclusionRects,
  toolbarSize,
}: {
  containerRect: DOMRectReadOnly
  exclusionRects: Partial<Record<string, DOMRectReadOnly>>
  toolbarSize: { width: number; height: number }
}): ToolbarPlacement {
  const detailsRect = exclusionRects['selected-details']
  const headerRect = exclusionRects['top-header']
  const localExclusionRects = Object.values(exclusionRects)
    .filter((rect): rect is DOMRectReadOnly => Boolean(rect))
    .map((rect) => toAbsoluteRect(rect))
  const candidates: Rect[] = []
  let preferredDockLeft: number | null = null
  const containerRight = getDomRectRight(containerRect)
  const containerBottom = getDomRectBottom(containerRect)

  if (detailsRect) {
    const detailsAbsoluteRect = toAbsoluteRect(detailsRect)
    const headerAbsoluteRect = headerRect ? toAbsoluteRect(headerRect) : null
    const topAboveDetails =
      detailsAbsoluteRect.top - toolbarSize.height - TOOLBAR_GAP
    const fallbackTop = getRectBottom(detailsAbsoluteRect) + TOOLBAR_GAP

    const preferredTop =
      headerAbsoluteRect &&
      topAboveDetails < getRectBottom(headerAbsoluteRect) + VIEWPORT_PADDING
        ? fallbackTop
        : topAboveDetails
    const alternateTop =
      preferredTop === topAboveDetails ? fallbackTop : topAboveDetails
    const detailsLeft = clamp(
      detailsAbsoluteRect.left,
      containerRect.left + VIEWPORT_PADDING,
      containerRight - toolbarSize.width - VIEWPORT_PADDING,
    )
    preferredDockLeft = detailsLeft

    candidates.push(
      createRect(detailsLeft, preferredTop, toolbarSize),
      createRect(detailsLeft, alternateTop, toolbarSize),
    )
  }

  for (const exclusionRect of localExclusionRects) {
    candidates.push(
      createRect(
        preferredDockLeft ??
          clamp(
            exclusionRect.left,
            containerRect.left + VIEWPORT_PADDING,
            containerRight - toolbarSize.width - VIEWPORT_PADDING,
          ),
        exclusionRect.top - toolbarSize.height - TOOLBAR_GAP,
        toolbarSize,
      ),
      createRect(
        exclusionRect.left - toolbarSize.width - TOOLBAR_GAP,
        containerBottom - toolbarSize.height - VIEWPORT_PADDING,
        toolbarSize,
      ),
    )
  }

  candidates.push(
    createRect(
      containerRight - toolbarSize.width - VIEWPORT_PADDING,
      containerBottom - toolbarSize.height - VIEWPORT_PADDING,
      toolbarSize,
    ),
    createRect(
      containerRect.left + VIEWPORT_PADDING,
      containerBottom - toolbarSize.height - VIEWPORT_PADDING,
      toolbarSize,
    ),
    createRect(
      containerRight - toolbarSize.width - VIEWPORT_PADDING,
      containerRect.top + VIEWPORT_PADDING,
      toolbarSize,
    ),
    createRect(
      containerRect.left + VIEWPORT_PADDING,
      containerRect.top + VIEWPORT_PADDING,
      toolbarSize,
    ),
  )

  const placementRect =
    getFirstValidRect(candidates, containerRect, localExclusionRects) ??
    candidates[0]
  return {
    mode: 'docked',
    side: 'docked',
    left: placementRect.left,
    top: placementRect.top,
  }
}

function getDockedResult({
  containerRect,
  exclusionRects,
  source,
  toolbarSize,
}: {
  containerRect: DOMRectReadOnly
  exclusionRects: Partial<Record<string, DOMRectReadOnly>>
  source?: ToolbarGeometrySource
  toolbarSize: { width: number; height: number }
}) {
  return {
    ...getDockedPlacement({
      containerRect,
      exclusionRects,
      toolbarSize,
    }),
    source,
  }
}

export function computeSelectedToolbarPlacement({
  containerRect,
  exclusionRects,
  forceDocked,
  points,
  previousFloatingCandidateId,
  projectedPointCount,
  source,
  sourcePointCount,
  toolbarSize,
}: {
  containerRect: DOMRectReadOnly
  exclusionRects: Partial<Record<string, DOMRectReadOnly>>
  forceDocked: boolean
  points: ScreenPoint[]
  previousFloatingCandidateId?: ToolbarFloatingCandidateId
  projectedPointCount?: number
  source?: ToolbarGeometrySource
  sourcePointCount?: number
  toolbarSize: { width: number; height: number }
}): ToolbarPlacement {
  const effectiveToolbarSize = {
    width: toolbarSize.width || 140,
    height: toolbarSize.height || 48,
  }

  const shouldDock = forceDocked || source === 'object-origin'

  if (shouldDock) {
    return getDockedResult({
      containerRect,
      exclusionRects,
      source,
      toolbarSize: effectiveToolbarSize,
    })
  }

  if (points.length === 0) {
    return {
      mode: 'hidden',
      left: 0,
      top: 0,
      side: 'docked',
    }
  }

  const bounds = getPointBounds(points)
  if (
    !bounds ||
    isLowConfidenceGeometry({
      bounds,
      containerRect,
      projectedPointCount,
      source,
      sourcePointCount,
    })
  ) {
    return getDockedResult({
      containerRect,
      exclusionRects,
      source,
      toolbarSize: effectiveToolbarSize,
    })
  }

  const absoluteExclusionRects = Object.values(exclusionRects)
    .filter((rect): rect is DOMRectReadOnly => Boolean(rect))
    .map((rect) => toAbsoluteRect(rect))
  const diagonalSidePreference = getDiagonalSidePreference(points)
  const hull = getConvexHull(points)
  const objectAvoidanceRect = inflateRect(bounds, OBJECT_CLEARANCE_GAP)
  const floatingCandidate = createFloatingCandidates({
    bounds,
    containerRect,
    diagonalSidePreference,
    exclusionRects: absoluteExclusionRects,
    hull,
    objectAvoidanceRect,
    points,
    previousFloatingCandidateId,
    toolbarSize: effectiveToolbarSize,
  })

  if (!floatingCandidate || floatingCandidate.score > MAX_FLOATING_SCORE) {
    return getDockedResult({
      containerRect,
      exclusionRects,
      source,
      toolbarSize: effectiveToolbarSize,
    })
  }

  return {
    mode: 'floating',
    left: floatingCandidate.adjustedRect.left,
    top: floatingCandidate.adjustedRect.top,
    side: floatingCandidate.side,
    source,
    candidateId: floatingCandidate.id,
  }
}
