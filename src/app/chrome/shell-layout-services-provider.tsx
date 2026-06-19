import { useMemo, type ReactNode } from 'react'
import { OverlayLayoutProvider } from '@/shared/layout/overlay-layout-provider'
import { useOverlayExclusionRects } from '@/shared/layout/use-overlay-exclusion-rects'

interface ShellLayoutServicesProviderProps {
  children: ReactNode
}

export function ShellLayoutServicesProvider({
  children,
}: ShellLayoutServicesProviderProps) {
  const { rects, registerExclusionElement } = useOverlayExclusionRects()

  const overlayLayout = useMemo(
    () => ({
      exclusionRects: rects,
      registerExclusionElement,
    }),
    [rects, registerExclusionElement],
  )

  return (
    <OverlayLayoutProvider value={overlayLayout}>
      {children}
    </OverlayLayoutProvider>
  )
}
