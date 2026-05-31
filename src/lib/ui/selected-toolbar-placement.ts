import {
  avoidsExclusions,
  clamp,
  createRect,
  fitsContainer,
  getContainerRect,
  getDomRectBottom,
  getDomRectRight,
  getRectBottom,
  getRectDistance,
  getRectIntersectionArea,
  inflateRect,
  toAbsoluteRect,
  type Rect,
  VIEWPORT_PADDING,
} from './rect-utils'
import {
  getConvexHull,
  getPointBounds,
  rectIntersectsPolygon,
  type PointBounds,
  type ScreenPoint,
} from './convex-geometry'
import {
  adjustRectToContainer,
  createRectFromAnchor,
  getAttachmentDistance,
  getCandidateAnchors,
  TOOLBAR_GAP,
  type FloatingCandidateAnchor,
  type ToolbarFloatingCandidateId,
  type ToolbarSide,
} from './toolbar-anchors'

export type { ScreenPoint } from './convex-geometry'
export type { ToolbarFloatingCandidateId, ToolbarSide } from './toolbar-anchors'

export type ToolbarGeometrySource =
  | 'ui-bounds-node'
  | 'render-bounds'
  | 'object-origin'

export type ToolbarPlacementMode = 'hidden' | 'floating' | 'docked'

export interface ToolbarPlacement {
  mode: ToolbarPlacementMode
  left: number
  top: number
  side: ToolbarSide
  source?: ToolbarGeometrySource
  candidateId?: ToolbarFloatingCandidateId
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

// Geometry confidence thresholds decide when projected bounds are too noisy to
// trust for floating placement.
const OBJECT_CLEARANCE_GAP = 8 // Soft spacing penalty around the selected footprint.
const MIN_PROJECTED_POINT_COUNT = 3 // Fewer projected points reads as unreliable geometry.
const MIN_PROJECTED_BOUNDS_SIZE = 24 // Tiny projected bounds are treated as noise.
const MIN_RENDER_PROJECTED_RATIO = 0.5 // Render bounds need at least half their points visible.
const MIN_UI_BOUNDS_PROJECTED_RATIO = 0.15 // Authored UI bounds can survive with less visible coverage.
const MIN_VISIBLE_BOUNDS_RATIO = 0.2 // Dock if too little of the projected bounds is on screen.
const MAX_BOUNDS_CONTAINER_SCALE = 1.5 // Reject implausibly oversized projected bounds.

// Hard candidate gates keep the toolbar visually attached before we fall back
// to the docked layout.
const MAX_CROSS_AXIS_CLAMP_SHIFT = 72 // Reject candidates that need too much sideways nudging.
const MAX_ATTACHMENT_DISTANCE = 120 // Reject candidates that feel too detached from the object.

// Scoring weights trade off continuity, readable spacing, and side preference
// once a candidate has cleared the hard rejection gates.
const HYSTERESIS_SCORE_DELTA = 24 // Keep the previous floating side unless another is clearly better.
const MAX_FLOATING_SCORE = 140 // Dock when every floating option is a poor fit.
const DIAGONAL_SIDE_BIAS_START = 0.7 // Only strongly diagonal, elongated shapes get side bias.
const DIAGONAL_SIDE_BIAS_TOP_PENALTY = 28 // Raise to make diagonal shapes leave top sooner.
const DIAGONAL_SIDE_BIAS_BOTTOM_PENALTY = 18 // Bottom stays slightly less preferred than top.
const DIAGONAL_SIDE_BIAS_SIDE_REWARD = 48 // Raise to make strong diagonals favor sides more often.
const EXCLUSION_CLEARANCE_SUPPORT_BAND = 48 // Exclusion proximity only matters within the first 48px.
const OBJECT_CLEARANCE_SUPPORT_BAND = 24 // Object clearance penalty saturates after a small visual gap.

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

function createFloatingCandidate(candidate: FloatingCandidateAnchor) {
  return candidate
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

  if (sourcePointCount === undefined || sourcePointCount <= 0) {
    return true
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
    EXCLUSION_CLEARANCE_SUPPORT_BAND -
      Math.min(
        EXCLUSION_CLEARANCE_SUPPORT_BAND,
        getMinimumExclusionDistance(candidate.adjustedRect, exclusionRects),
      ),
  )
  const objectClearancePenalty = Math.max(
    0,
    OBJECT_CLEARANCE_SUPPORT_BAND -
      Math.min(
        OBJECT_CLEARANCE_SUPPORT_BAND,
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
  const candidates = getCandidateAnchors(points, bounds, hull)
    .map(createFloatingCandidate)
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
