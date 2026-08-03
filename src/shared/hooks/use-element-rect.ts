import { useCallback, useRef, useState, useSyncExternalStore } from 'react'

interface ElementRectOptions {
  trackPosition?: boolean
}

function createRectSnapshot(rect: DOMRectReadOnly): DOMRectReadOnly {
  return {
    x: rect.x,
    y: rect.y,
    width: rect.width,
    height: rect.height,
    left: rect.left,
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    toJSON: () => ({}),
  }
}

function areRectsEqual(
  left: DOMRectReadOnly | null,
  right: DOMRectReadOnly | null,
  trackPosition = true,
) {
  if (!left || !right) {
    return left === right
  }

  if (left.width !== right.width || left.height !== right.height) {
    return false
  }

  if (!trackPosition) {
    return true
  }

  return (
    left.x === right.x &&
    left.y === right.y &&
    left.width === right.width &&
    left.height === right.height
  )
}

function useMeasuredElementRect(
  element: HTMLElement | null,
  trackPosition = true,
) {
  const rectSnapshotRef = useRef<DOMRectReadOnly | null>(null)

  const getSnapshot = useCallback(() => {
    if (!element) {
      rectSnapshotRef.current = null
      return null
    }

    const nextRect = createRectSnapshot(element.getBoundingClientRect())
    if (areRectsEqual(rectSnapshotRef.current, nextRect, trackPosition)) {
      return rectSnapshotRef.current
    }

    rectSnapshotRef.current = nextRect
    return nextRect
  }, [element, trackPosition])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      // Primes rectSnapshotRef so the equality check has a baseline.
      getSnapshot()

      if (!element) {
        return () => undefined
      }

      let cancelled = false
      const notify = () => {
        if (!cancelled) {
          onStoreChange()
        }
      }

      // Forces one post-layout re-read: the rect measured during render
      // predates layout, and no observer fires for the initial size.
      queueMicrotask(() => {
        notify()
      })

      const handleViewportChange = () => {
        notify()
      }

      let observer: ResizeObserver | null = null
      const hasResizeObserver = typeof ResizeObserver !== 'undefined'
      if (hasResizeObserver) {
        observer = new ResizeObserver(() => {
          notify()
        })
        observer.observe(element)
      }

      if (trackPosition || !hasResizeObserver) {
        window.addEventListener('resize', handleViewportChange)
      }

      if (trackPosition) {
        window.addEventListener('scroll', handleViewportChange, true)
        window.visualViewport?.addEventListener('resize', handleViewportChange)
        window.visualViewport?.addEventListener('scroll', handleViewportChange)
      }

      return () => {
        cancelled = true
        observer?.disconnect()

        if (trackPosition || !hasResizeObserver) {
          window.removeEventListener('resize', handleViewportChange)
        }

        if (trackPosition) {
          window.removeEventListener('scroll', handleViewportChange, true)
          window.visualViewport?.removeEventListener(
            'resize',
            handleViewportChange,
          )
          window.visualViewport?.removeEventListener(
            'scroll',
            handleViewportChange,
          )
        }
      }
    },
    [element, getSnapshot, trackPosition],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}

export function useElementRectRef(options?: ElementRectOptions) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const trackPosition = options?.trackPosition ?? true
  const ref = useCallback((nextElement: HTMLElement | null) => {
    setElement(nextElement)
  }, [])

  return {
    ref,
    rect: useMeasuredElementRect(element, trackPosition),
  }
}
