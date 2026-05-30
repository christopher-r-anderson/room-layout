import {
  useCallback,
  useLayoutEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type RefObject,
} from 'react'

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

export function useElementRect(ref?: RefObject<HTMLElement | null>) {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const rectSnapshotRef = useRef<DOMRectReadOnly | null>(null)

  useLayoutEffect(() => {
    const nextElement = ref?.current ?? null

    if (element !== nextElement) {
      setElement(nextElement)
    }
  }, [element, ref])

  const getSnapshot = useCallback(() => {
    if (!element) {
      rectSnapshotRef.current = null
      return null
    }

    const nextRect = createRectSnapshot(element.getBoundingClientRect())
    if (areRectsEqual(rectSnapshotRef.current, nextRect)) {
      return rectSnapshotRef.current
    }

    rectSnapshotRef.current = nextRect
    return nextRect
  }, [element])

  const subscribe = useCallback(
    (onStoreChange: () => void) => {
      getSnapshot()

      if (!element) {
        return () => undefined
      }

      queueMicrotask(() => {
        onStoreChange()
      })

      const handleViewportChange = () => {
        onStoreChange()
      }

      let observer: ResizeObserver | null = null
      if (typeof ResizeObserver !== 'undefined') {
        observer = new ResizeObserver(() => {
          onStoreChange()
        })
        observer.observe(element)
      }

      window.addEventListener('resize', handleViewportChange)
      window.addEventListener('scroll', handleViewportChange, true)
      window.visualViewport?.addEventListener('resize', handleViewportChange)
      window.visualViewport?.addEventListener('scroll', handleViewportChange)

      return () => {
        observer?.disconnect()
        window.removeEventListener('resize', handleViewportChange)
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
    },
    [element, getSnapshot],
  )

  return useSyncExternalStore(subscribe, getSnapshot, () => null)
}
