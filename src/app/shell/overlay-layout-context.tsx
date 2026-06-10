/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, type ReactNode } from 'react'
import type { OverlayExclusionRectId } from './use-overlay-exclusion-rects'

interface OverlayLayout {
  exclusionRects: Partial<Record<OverlayExclusionRectId, DOMRectReadOnly>>
  registerExclusionElement: (
    key: OverlayExclusionRectId,
  ) => (element: HTMLElement | null) => void
  syncLayoutMode: (layout: 'mobile' | 'desktop') => void
}

const OverlayLayoutContext = createContext<OverlayLayout | null>(null)

export function useOverlayLayout(): OverlayLayout {
  const value = useContext(OverlayLayoutContext)

  if (value === null) {
    throw new Error(
      'useOverlayLayout must be used within an OverlayLayoutProvider.',
    )
  }

  return value
}

export function OverlayLayoutProvider(props: {
  value: OverlayLayout
  children: ReactNode
}) {
  return (
    <OverlayLayoutContext.Provider value={props.value}>
      {props.children}
    </OverlayLayoutContext.Provider>
  )
}
