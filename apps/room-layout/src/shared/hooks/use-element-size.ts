import { useMemo } from 'react'
import { useElementRectRef } from './use-element-rect'

export function useElementSize() {
  const { ref, rect } = useElementRectRef({ trackPosition: false })
  const size = useMemo(
    () => ({ width: rect?.width ?? 0, height: rect?.height ?? 0 }),
    [rect?.height, rect?.width],
  )

  return { ref, size }
}
