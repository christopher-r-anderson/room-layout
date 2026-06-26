import {
  clamp,
  getDomRectBottom,
  getDomRectRight,
  type Rect,
  VIEWPORT_PADDING,
} from './rect-utils'
import {
  getContourXAtY,
  getContourXInYRange,
  getContourYAtX,
  getContourYInXRange,
  type PointBounds,
  type ScreenPoint,
} from './convex-geometry'

export type ToolbarSide = 'top' | 'bottom' | 'left' | 'right'
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

export interface FloatingCandidateAnchor {
  id: ToolbarFloatingCandidateId
  side: ToolbarSide
  anchor: ScreenPoint
}

export interface CandidateAnchorDefinition {
  id: ToolbarFloatingCandidateId
  side: ToolbarSide
  axisRatio: number
}

const TOOLBAR_GAP = 12 // Visual offset between the object contour and toolbar.
const SUPPORT_BAND_TOLERANCE = 16 // How much point spread still counts as one visible edge.

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

function getAnchor(points: ScreenPoint[], side: ToolbarSide) {
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

export function createRectFromAnchor(
  anchor: ScreenPoint,
  hull: ScreenPoint[],
  side: ToolbarSide,
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

export function adjustRectToContainer(
  rect: Rect,
  side: ToolbarSide,
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

export function getAttachmentDistance(rect: Rect, anchor: ScreenPoint) {
  const rectCenterX = rect.left + rect.width / 2
  const rectCenterY = rect.top + rect.height / 2

  return Math.hypot(rectCenterX - anchor.x, rectCenterY - anchor.y)
}

function resolveCandidateAnchor(
  definition: CandidateAnchorDefinition,
  bounds: PointBounds,
  hull: ScreenPoint[],
  anchors: Partial<Record<ToolbarSide, ScreenPoint>>,
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

export function getCandidateAnchors(
  points: ScreenPoint[],
  bounds: PointBounds,
  hull: ScreenPoint[],
) {
  const anchors: Partial<Record<ToolbarSide, ScreenPoint>> = {
    top: getAnchor(points, 'top') ?? undefined,
    bottom: getAnchor(points, 'bottom') ?? undefined,
    left: getAnchor(points, 'left') ?? undefined,
    right: getAnchor(points, 'right') ?? undefined,
  }

  const resolvedAnchors = CANDIDATE_ANCHOR_DEFINITIONS.map((definition) => {
    const anchor = resolveCandidateAnchor(definition, bounds, hull, anchors)

    return anchor
      ? {
          id: definition.id,
          side: definition.side,
          anchor,
        }
      : null
  })

  return resolvedAnchors.every(Boolean)
    ? (resolvedAnchors as FloatingCandidateAnchor[])
    : []
}
