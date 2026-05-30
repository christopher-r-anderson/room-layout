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

export interface ToolbarPlacement {
  mode: ToolbarPlacementMode
  left: number
  top: number
  side: ToolbarSide
  source?: ToolbarGeometrySource
}

interface Rect {
  left: number
  top: number
  width: number
  height: number
}

const VIEWPORT_PADDING = 12
const TOOLBAR_GAP = 12
const SUPPORT_BAND_TOLERANCE = 16

function intersects(left: Rect, right: Rect) {
  return !(
    left.left + left.width <= right.left ||
    right.left + right.width <= left.left ||
    left.top + left.height <= right.top ||
    right.top + right.height <= left.top
  )
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
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
  side: Exclude<ToolbarSide, 'docked'>,
  toolbarSize: { width: number; height: number },
): Rect {
  if (side === 'top') {
    return {
      left: anchor.x - toolbarSize.width / 2,
      top: anchor.y - TOOLBAR_GAP - toolbarSize.height,
      width: toolbarSize.width,
      height: toolbarSize.height,
    }
  }

  if (side === 'bottom') {
    return {
      left: anchor.x - toolbarSize.width / 2,
      top: anchor.y + TOOLBAR_GAP,
      width: toolbarSize.width,
      height: toolbarSize.height,
    }
  }

  if (side === 'left') {
    return {
      left: anchor.x - TOOLBAR_GAP - toolbarSize.width,
      top: anchor.y - toolbarSize.height / 2,
      width: toolbarSize.width,
      height: toolbarSize.height,
    }
  }

  return {
    left: anchor.x + TOOLBAR_GAP,
    top: anchor.y - toolbarSize.height / 2,
    width: toolbarSize.width,
    height: toolbarSize.height,
  }
}

function fitsViewport(rect: Rect, viewport: { width: number; height: number }) {
  return (
    rect.left >= VIEWPORT_PADDING &&
    rect.top >= VIEWPORT_PADDING &&
    rect.left + rect.width <= viewport.width - VIEWPORT_PADDING &&
    rect.top + rect.height <= viewport.height - VIEWPORT_PADDING
  )
}

function toLocalRect(
  rect: DOMRectReadOnly,
  containerRect: DOMRectReadOnly,
): Rect {
  return {
    left: rect.left - containerRect.left,
    top: rect.top - containerRect.top,
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

function getFirstValidRect(
  candidates: Rect[],
  containerRect: DOMRectReadOnly,
  exclusionRects: Rect[],
) {
  return candidates.find(
    (candidate) =>
      fitsViewport(candidate, containerRect) &&
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
    .map((rect) => toLocalRect(rect, containerRect))
  const candidates: Rect[] = []
  let preferredDockLeft: number | null = null

  if (detailsRect) {
    const localDetailsRect = toLocalRect(detailsRect, containerRect)
    const localHeaderRect = headerRect
      ? toLocalRect(headerRect, containerRect)
      : null
    const topAboveDetails =
      localDetailsRect.top - toolbarSize.height - TOOLBAR_GAP
    const fallbackTop =
      localDetailsRect.top + localDetailsRect.height + TOOLBAR_GAP

    const preferredTop =
      localHeaderRect &&
      topAboveDetails <
        localHeaderRect.top + localHeaderRect.height + VIEWPORT_PADDING
        ? fallbackTop
        : topAboveDetails
    const alternateTop =
      preferredTop === topAboveDetails ? fallbackTop : topAboveDetails
    const detailsLeft = clamp(
      localDetailsRect.left,
      VIEWPORT_PADDING,
      containerRect.width - toolbarSize.width - VIEWPORT_PADDING,
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
            VIEWPORT_PADDING,
            containerRect.width - toolbarSize.width - VIEWPORT_PADDING,
          ),
        exclusionRect.top - toolbarSize.height - TOOLBAR_GAP,
        toolbarSize,
      ),
      createRect(
        exclusionRect.left - toolbarSize.width - TOOLBAR_GAP,
        containerRect.height - toolbarSize.height - VIEWPORT_PADDING,
        toolbarSize,
      ),
    )
  }

  candidates.push(
    createRect(
      containerRect.width - toolbarSize.width - VIEWPORT_PADDING,
      containerRect.height - toolbarSize.height - VIEWPORT_PADDING,
      toolbarSize,
    ),
    createRect(
      VIEWPORT_PADDING,
      containerRect.height - toolbarSize.height - VIEWPORT_PADDING,
      toolbarSize,
    ),
    createRect(
      containerRect.width - toolbarSize.width - VIEWPORT_PADDING,
      VIEWPORT_PADDING,
      toolbarSize,
    ),
    createRect(VIEWPORT_PADDING, VIEWPORT_PADDING, toolbarSize),
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

export function computeSelectedToolbarPlacement({
  containerRect,
  exclusionRects,
  forceDocked,
  points,
  source,
  toolbarSize,
}: {
  containerRect: DOMRectReadOnly
  exclusionRects: Partial<Record<string, DOMRectReadOnly>>
  forceDocked: boolean
  points: ScreenPoint[]
  source?: ToolbarGeometrySource
  toolbarSize: { width: number; height: number }
}): ToolbarPlacement {
  const effectiveToolbarSize = {
    width: toolbarSize.width || 140,
    height: toolbarSize.height || 48,
  }

  const shouldDock = forceDocked || source === 'object-origin'

  if (shouldDock) {
    return {
      ...getDockedPlacement({
        containerRect,
        exclusionRects,
        toolbarSize: effectiveToolbarSize,
      }),
      source,
    }
  }

  if (points.length === 0) {
    return {
      mode: 'hidden',
      left: 0,
      top: 0,
      side: 'docked',
    }
  }

  const localPoints = points.map((point) => ({
    x: point.x - containerRect.left,
    y: point.y - containerRect.top,
  }))
  const localExclusionRects = Object.values(exclusionRects)
    .filter((rect): rect is DOMRectReadOnly => Boolean(rect))
    .map((rect) => toLocalRect(rect, containerRect))

  for (const side of ['top', 'bottom', 'right', 'left'] as const) {
    const anchor = getAnchor(localPoints, side)
    if (!anchor) {
      continue
    }

    const rect = createRectFromAnchor(anchor, side, effectiveToolbarSize)
    if (!fitsViewport(rect, containerRect)) {
      continue
    }

    if (!avoidsExclusions(rect, localExclusionRects)) {
      continue
    }

    return {
      mode: 'floating',
      left: rect.left,
      top: rect.top,
      side,
      source,
    }
  }

  return {
    ...getDockedPlacement({
      containerRect,
      exclusionRects,
      toolbarSize: effectiveToolbarSize,
    }),
    source,
  }
}
