import { useMemo, type ReactNode } from 'react'
import { OverlayLayoutProvider } from './overlay-layout-context'
import { useOverlayExclusionRects } from './use-overlay-exclusion-rects'

interface ShellLayoutServicesProviderProps {
  syncLayoutMode: (layout: 'mobile' | 'desktop') => void
  children: ReactNode
}

export function ShellLayoutServicesProvider({
  syncLayoutMode,
  children,
}: ShellLayoutServicesProviderProps) {
  const { rects, registerExclusionElement } = useOverlayExclusionRects()

  const overlayLayout = useMemo(
    () => ({
      exclusionRects: rects,
      registerExclusionElement,
      syncLayoutMode,
    }),
    [rects, registerExclusionElement, syncLayoutMode],
  )

  return (
    <OverlayLayoutProvider value={overlayLayout}>
      {children}
    </OverlayLayoutProvider>
  )
}
