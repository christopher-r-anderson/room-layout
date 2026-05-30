import { useCallback, useEffect, useRef, useState } from 'react'

export type OverlayExclusionRectId =
  | 'top-header'
  | 'outliner'
  | 'selected-details'
  | 'camera-tools'
  | 'desktop-room-sidebar'
  | 'mobile-room-drawer'

type ExclusionRectMap = Partial<Record<OverlayExclusionRectId, DOMRectReadOnly>>

function areRectsEqual(
  left: DOMRectReadOnly | undefined,
  right: DOMRectReadOnly | undefined,
) {
  if (!left || !right) {
    return left === right
  }

  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  )
}

export function useOverlayExclusionRects() {
  const elementsRef = useRef(new Map<OverlayExclusionRectId, HTMLElement>())
  const callbacksRef = useRef(
    new Map<OverlayExclusionRectId, (element: HTMLElement | null) => void>(),
  )
  const observerRef = useRef<ResizeObserver | null>(null)
  const refreshQueuedRef = useRef(false)
  const [rects, setRects] = useState<ExclusionRectMap>({})

  const refreshRects = useCallback(() => {
    const nextRects: ExclusionRectMap = {}

    for (const [id, element] of elementsRef.current) {
      nextRects[id] = element.getBoundingClientRect()
    }

    setRects((currentRects) => {
      const currentKeys = Object.keys(currentRects) as OverlayExclusionRectId[]
      const nextKeys = Object.keys(nextRects) as OverlayExclusionRectId[]

      if (
        currentKeys.length === nextKeys.length &&
        nextKeys.every((key) =>
          areRectsEqual(currentRects[key], nextRects[key]),
        )
      ) {
        return currentRects
      }

      return nextRects
    })
  }, [])

  const scheduleRefreshRects = useCallback(() => {
    if (refreshQueuedRef.current) {
      return
    }

    refreshQueuedRef.current = true
    queueMicrotask(() => {
      refreshQueuedRef.current = false
      refreshRects()
    })
  }, [refreshRects])

  useEffect(() => {
    if (typeof ResizeObserver !== 'undefined') {
      observerRef.current?.disconnect()
      observerRef.current = new ResizeObserver(() => {
        refreshRects()
      })

      for (const element of elementsRef.current.values()) {
        observerRef.current.observe(element)
      }
    }

    const handleViewportChange = () => {
      refreshRects()
    }

    window.addEventListener('resize', handleViewportChange)
    window.addEventListener('scroll', handleViewportChange, true)
    window.visualViewport?.addEventListener('resize', handleViewportChange)
    window.visualViewport?.addEventListener('scroll', handleViewportChange)

    return () => {
      observerRef.current?.disconnect()
      window.removeEventListener('resize', handleViewportChange)
      window.removeEventListener('scroll', handleViewportChange, true)
      window.visualViewport?.removeEventListener('resize', handleViewportChange)
      window.visualViewport?.removeEventListener('scroll', handleViewportChange)
    }
  }, [refreshRects])

  const registerExclusionElement = useCallback(
    (id: OverlayExclusionRectId) => {
      const existing = callbacksRef.current.get(id)
      if (existing) {
        return existing
      }

      const callback = (element: HTMLElement | null) => {
        const current = elementsRef.current.get(id)
        if (element) {
          if (current === element) {
            return
          }

          if (current) {
            observerRef.current?.unobserve(current)
          }

          elementsRef.current.set(id, element)
          observerRef.current?.observe(element)
        } else if (current) {
          elementsRef.current.delete(id)
          observerRef.current?.unobserve(current)
        } else {
          return
        }

        scheduleRefreshRects()
      }

      callbacksRef.current.set(id, callback)
      return callback
    },
    [scheduleRefreshRects],
  )

  return {
    rects,
    refreshRects,
    registerExclusionElement,
  }
}
