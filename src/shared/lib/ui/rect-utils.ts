export const VIEWPORT_PADDING = 12 // Minimum gap from the room-view edges.

export interface Rect {
  left: number
  top: number
  width: number
  height: number
}

export function getRectRight(rect: Pick<Rect, 'left' | 'width'>) {
  return rect.left + rect.width
}

export function getRectBottom(rect: Pick<Rect, 'top' | 'height'>) {
  return rect.top + rect.height
}

export function getDomRectRight(rect: DOMRectReadOnly) {
  return rect.right || rect.left + rect.width
}

export function getDomRectBottom(rect: DOMRectReadOnly) {
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

export function clamp(value: number, min: number, max: number) {
  if (min > max) {
    return min
  }

  return Math.min(Math.max(value, min), max)
}

export function fitsContainer(rect: Rect, containerRect: DOMRectReadOnly) {
  return (
    rect.left >= containerRect.left + VIEWPORT_PADDING &&
    rect.top >= containerRect.top + VIEWPORT_PADDING &&
    getRectRight(rect) <= getDomRectRight(containerRect) - VIEWPORT_PADDING &&
    getRectBottom(rect) <= getDomRectBottom(containerRect) - VIEWPORT_PADDING
  )
}

export function getContainerRect(containerRect: DOMRectReadOnly): Rect {
  return {
    left: containerRect.left,
    top: containerRect.top,
    width: containerRect.width,
    height: containerRect.height,
  }
}

export function toAbsoluteRect(rect: DOMRectReadOnly): Rect {
  return {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
  }
}

export function avoidsExclusions(rect: Rect, exclusionRects: Rect[]) {
  return !exclusionRects.some((exclusionRect) =>
    intersects(rect, exclusionRect),
  )
}

export function createRect(
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

export function getRectIntersectionArea(left: Rect, right: Rect) {
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

export function getRectDistance(left: Rect, right: Rect) {
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

export function getRectCorners(rect: Rect) {
  return [
    { x: rect.left, y: rect.top },
    { x: getRectRight(rect), y: rect.top },
    { x: getRectRight(rect), y: getRectBottom(rect) },
    { x: rect.left, y: getRectBottom(rect) },
  ]
}

export function inflateRect(rect: Rect, amount: number): Rect {
  return {
    left: rect.left - amount,
    top: rect.top - amount,
    width: rect.width + amount * 2,
    height: rect.height + amount * 2,
  }
}
