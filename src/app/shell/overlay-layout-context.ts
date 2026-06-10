import { createContext, useContext } from 'react'
import type { OverlayExclusionRectId } from './use-overlay-exclusion-rects'

interface OverlayLayout {
  exclusionRects: Partial<Record<OverlayExclusionRectId, DOMRectReadOnly>>
  registerExclusionElement: (
    key: OverlayExclusionRectId,
  ) => (element: HTMLElement | null) => void
  syncLayoutMode: (layout: 'mobile' | 'desktop') => void
}

export const OverlayLayoutContext = createContext<OverlayLayout | null>(null)

export function useOverlayLayout(): OverlayLayout {
  const value = useContext(OverlayLayoutContext)

  if (value === null) {
    throw new Error(
      'useOverlayLayout must be used within an OverlayLayoutProvider.',
    )
  }

  return value
}
