/* eslint-disable react-refresh/only-export-components */

import { createContext, useContext, type ReactNode } from 'react'
import type { OverlayExclusionRectId } from '@/app/overlay/use-overlay-exclusion-rects'

export interface OverlayLayout {
  exclusionRects: readonly DOMRectReadOnly[]
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
