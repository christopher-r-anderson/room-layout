import { useMemo, type ReactNode } from 'react'
import { OverlayLayoutProvider } from './overlay-layout-provider'
import { useOverlayExclusionRects } from './use-overlay-exclusion-rects'
import type { HeaderLayoutMode } from './use-header-layout-mode'

interface ShellLayoutServicesProviderProps {
  syncLayoutMode: (layout: HeaderLayoutMode) => void
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
