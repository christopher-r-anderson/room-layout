import { useCallback, useLayoutEffect, useState } from 'react'

export function useElementSize() {
  const [element, setElement] = useState<HTMLElement | null>(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const ref = useCallback((nextElement: HTMLElement | null) => {
    setElement(nextElement)
  }, [])

  useLayoutEffect(() => {
    if (!element) {
      return
    }

    const update = () => {
      const rect = element.getBoundingClientRect()
      setSize((current) => {
        if (current.width === rect.width && current.height === rect.height) {
          return current
        }

        return {
          width: rect.width,
          height: rect.height,
        }
      })
    }

    update()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)

      return () => {
        window.removeEventListener('resize', update)
      }
    }

    const observer = new ResizeObserver(update)
    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [element])

  return { ref, size }
}
