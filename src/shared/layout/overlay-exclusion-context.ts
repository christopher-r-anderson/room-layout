import { createContext, useContext } from 'react'
import type { OverlayExclusionRectId } from './use-overlay-exclusion-rects'

export type ExclusionRectMap = Partial<
  Record<OverlayExclusionRectId, DOMRectReadOnly>
>

export type RegisterExclusionElement = (
  key: OverlayExclusionRectId,
) => (element: HTMLElement | null) => void

// Split into two contexts so the stable registration handle and the changing
// measured rects do not share a value identity. Components that only register
// elements read the registry and never re-render when the rects update.
export const ExclusionRegistryContext =
  createContext<RegisterExclusionElement | null>(null)
export const ExclusionRectsContext = createContext<ExclusionRectMap | null>(
  null,
)

export function useExclusionRegistry(): RegisterExclusionElement {
  const value = useContext(ExclusionRegistryContext)

  if (value === null) {
    throw new Error(
      'useExclusionRegistry must be used within an OverlayExclusionProvider.',
    )
  }

  return value
}

export function useExclusionRects(): ExclusionRectMap {
  const value = useContext(ExclusionRectsContext)

  if (value === null) {
    throw new Error(
      'useExclusionRects must be used within an OverlayExclusionProvider.',
    )
  }

  return value
}
