import { useMemo, type ReactNode } from 'react'
import { OverlayLayoutProvider } from '@/shared/layout/overlay-layout-provider'
import { useOverlayExclusionRects } from '@/shared/layout/use-overlay-exclusion-rects'
import type { HeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'

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
