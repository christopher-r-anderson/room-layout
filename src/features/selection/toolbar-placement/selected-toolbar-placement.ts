// Selected-item toolbar placement. Given the selected object's projected screen
// points, the room-view container, and the UI panel rects to keep clear, it
// decides where to float the toolbar:
//   1. project points -> convex hull + bounds (convex-geometry).
//   2. anchor up to 12 candidates around the hull (toolbar-anchors).
//   3. reject candidates that leave the screen, overlap a panel, or detach from
//      the object; score the survivors on continuity, spacing, and a diagonal
//      side bias; apply hysteresis so the choice is stable across frames.
//   4. if nothing attaches cleanly, never hide - fall back to a clamped anchor
//      that may overlap the object, stays on screen, and overlaps panels as
//      little as the screen allows.
import {
  avoidsExclusions,
  clamp,
  fitsContainer,
  getContainerRect,
  getDomRectBottom,
  getDomRectRight,
  getRectDistance,
  getRectIntersectionArea,
  inflateRect,
  toAbsoluteRect,
  VIEWPORT_PADDING,
  type Rect,
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
  type ToolbarFloatingCandidateId,
  type ToolbarSide,
} from './toolbar-anchors'

export type { ScreenPoint } from './convex-geometry'
export type { ToolbarFloatingCandidateId } from './toolbar-anchors'

export type ToolbarGeometrySource =
  | 'ui-bounds-node'
  | 'render-bounds'
  | 'object-origin'

type ToolbarPlacementMode = 'hidden' | 'floating'

export interface ToolbarPlacement {
  mode: ToolbarPlacementMode
  left: number
  top: number
  side?: ToolbarSide
  source?: ToolbarGeometrySource
  candidateId?: ToolbarFloatingCandidateId
}

interface FloatingCandidate {
  id: ToolbarFloatingCandidateId
  side: ToolbarSide
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
const MIN_VISIBLE_BOUNDS_RATIO = 0.2 // Use the fallback if too little of the projected bounds is on screen.
const MAX_BOUNDS_CONTAINER_SCALE = 1.5 // Reject implausibly oversized projected bounds.

// Hard candidate gates keep the toolbar visually attached before we fall back
// to a clamped placement.
const MAX_CROSS_AXIS_CLAMP_SHIFT = 72 // Reject candidates that need too much sideways nudging.
const MAX_ATTACHMENT_DISTANCE = 120 // Reject candidates that feel too detached from the object.

// Scoring weights trade off continuity, readable spacing, and side preference
// once a candidate has cleared the hard rejection gates.
const HYSTERESIS_SCORE_DELTA = 24 // Keep the previous floating side unless another is clearly better.
const MAX_FLOATING_SCORE = 140 // Use the clamped fallback when every floating option is a poor fit.
const DIAGONAL_SIDE_BIAS_START = 0.7 // Only strongly diagonal, elongated shapes get side bias.
const DIAGONAL_SIDE_BIAS_TOP_PENALTY = 28 // Raise to make diagonal shapes leave top sooner.
const DIAGONAL_SIDE_BIAS_BOTTOM_PENALTY = 18 // Bottom stays slightly less preferred than top.
const DIAGONAL_SIDE_BIAS_SIDE_REWARD = 48 // Raise to make strong diagonals favor sides more often.
const EXCLUSION_CLEARANCE_SUPPORT_BAND = 48 // Exclusion proximity only matters within the first 48px.
const OBJECT_CLEARANCE_SUPPORT_BAND = 24 // Object clearance penalty saturates after a small visual gap.

// How much the projected footprint wants a left/right anchor over top/bottom,
// in 0..1. A long, thin object rotated on a diagonal (e.g. a couch seen from
// above) looks detached with a toolbar pinned above its bounding box, but reads
// well beside its long edge. We detect that case with PCA on the projected
// points: the covariance matrix's eigenvalues give the footprint's dominant
// axis length vs width (elongation), and the axis angle gives how diagonal it
// is. Strong preference needs BOTH - diagonal orientation and a long/narrow
// shape - so axis-aligned or chunky objects keep their normal top preference.
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
  side: ToolbarSide,
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

  // Hysteresis: the geometry re-projects every frame, so scores wobble as the
  // camera drifts. Keep last frame's anchor unless another scores clearly
  // better (by more than HYSTERESIS_SCORE_DELTA) so the toolbar doesn't flip
  // sides on tiny score changes.
  if (
    previousCandidate &&
    previousCandidate.score <= bestCandidate.score + HYSTERESIS_SCORE_DELTA
  ) {
    return previousCandidate
  }

  return bestCandidate
}

const FALLBACK_GAP = 12 // Visual offset from the object when no clean spot exists.

function getBoundsRight(bounds: PointBounds) {
  return bounds.left + bounds.width
}

function getBoundsBottom(bounds: PointBounds) {
  return bounds.top + bounds.height
}

function clampRectToContainer(
  rect: Rect,
  containerRect: DOMRectReadOnly,
): Rect {
  return {
    ...rect,
    left: clamp(
      rect.left,
      containerRect.left + VIEWPORT_PADDING,
      getDomRectRight(containerRect) - rect.width - VIEWPORT_PADDING,
    ),
    top: clamp(
      rect.top,
      containerRect.top + VIEWPORT_PADDING,
      getDomRectBottom(containerRect) - rect.height - VIEWPORT_PADDING,
    ),
  }
}

function getTotalExclusionOverlap(rect: Rect, exclusionRects: Rect[]) {
  return exclusionRects.reduce(
    (sum, exclusionRect) => sum + getRectIntersectionArea(rect, exclusionRect),
    0,
  )
}

const FALLBACK_CANDIDATE_ID_BY_SIDE = {
  top: 'top-center',
  bottom: 'bottom-center',
  left: 'left-center',
  right: 'right-center',
} as const

// When no candidate attaches cleanly, the toolbar still shows rather than
// hiding: anchor it near the object on a simple side, keep it on screen, and
// prefer whichever side overlaps the UI panels least. Overlapping the object
// itself is acceptable here - the user can orbit or deselect.
function computeClampedFallback(
  bounds: PointBounds,
  containerRect: DOMRectReadOnly,
  exclusionRects: Rect[],
  toolbarSize: { width: number; height: number },
): ToolbarPlacement {
  const sides: { side: ToolbarSide; rect: Rect }[] = [
    {
      side: 'top',
      rect: {
        left: bounds.centerX - toolbarSize.width / 2,
        top: bounds.top - FALLBACK_GAP - toolbarSize.height,
        width: toolbarSize.width,
        height: toolbarSize.height,
      },
    },
    {
      side: 'bottom',
      rect: {
        left: bounds.centerX - toolbarSize.width / 2,
        top: getBoundsBottom(bounds) + FALLBACK_GAP,
        width: toolbarSize.width,
        height: toolbarSize.height,
      },
    },
    {
      side: 'left',
      rect: {
        left: bounds.left - FALLBACK_GAP - toolbarSize.width,
        top: bounds.centerY - toolbarSize.height / 2,
        width: toolbarSize.width,
        height: toolbarSize.height,
      },
    },
    {
      side: 'right',
      rect: {
        left: getBoundsRight(bounds) + FALLBACK_GAP,
        top: bounds.centerY - toolbarSize.height / 2,
        width: toolbarSize.width,
        height: toolbarSize.height,
      },
    },
  ]

  let best: {
    side: ToolbarSide
    rect: Rect
    overlap: number
  } | null = null
  for (const { side, rect } of sides) {
    const clamped = clampRectToContainer(rect, containerRect)
    const overlap = getTotalExclusionOverlap(clamped, exclusionRects)
    if (best === null || overlap < best.overlap) {
      best = { side, rect: clamped, overlap }
    }
  }

  const chosen = best ?? {
    side: 'top' as const,
    rect: clampRectToContainer(sides[0].rect, containerRect),
  }

  return {
    mode: 'floating',
    left: chosen.rect.left,
    top: chosen.rect.top,
    side: chosen.side,
    candidateId: FALLBACK_CANDIDATE_ID_BY_SIDE[chosen.side],
  }
}

export function computeSelectedToolbarPlacement({
  containerRect,
  exclusionRects,
  points,
  previousFloatingCandidateId,
  projectedPointCount,
  source,
  sourcePointCount,
  toolbarSize,
}: {
  containerRect: DOMRectReadOnly
  exclusionRects: Partial<Record<string, DOMRectReadOnly>>
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

  // No projected geometry yet (e.g. before the first projection frame). Nothing
  // to anchor to, so stay hidden for this frame rather than guess.
  if (points.length === 0) {
    return { mode: 'hidden', left: 0, top: 0 }
  }

  const bounds = getPointBounds(points)
  if (!bounds) {
    return { mode: 'hidden', left: 0, top: 0 }
  }

  const absoluteExclusionRects = Object.values(exclusionRects)
    .filter((rect): rect is DOMRectReadOnly => Boolean(rect))
    .map((rect) => toAbsoluteRect(rect))

  // Untrustworthy projection: skip the contour search and place a stable
  // best-effort toolbar instead of jittering on noisy bounds.
  if (
    isLowConfidenceGeometry({
      bounds,
      containerRect,
      projectedPointCount,
      source,
      sourcePointCount,
    })
  ) {
    return computeClampedFallback(
      bounds,
      containerRect,
      absoluteExclusionRects,
      effectiveToolbarSize,
    )
  }

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

  // No candidate attaches cleanly (object crowded against the panels/edges).
  // Fall back to a clamped position rather than hiding.
  if (!floatingCandidate || floatingCandidate.score > MAX_FLOATING_SCORE) {
    return computeClampedFallback(
      bounds,
      containerRect,
      absoluteExclusionRects,
      effectiveToolbarSize,
    )
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
