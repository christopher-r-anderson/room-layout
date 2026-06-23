import { type ReactNode } from 'react'
import { OverlayExclusionProvider } from '@/shared/layout/overlay-exclusion-provider'
import { useOverlayExclusionRects } from '@/shared/layout/use-overlay-exclusion-rects'

interface ShellLayoutServicesProviderProps {
  children: ReactNode
}

export function ShellLayoutServicesProvider({
  children,
}: ShellLayoutServicesProviderProps) {
  const { rects, registerExclusionElement } = useOverlayExclusionRects()

  return (
    <OverlayExclusionProvider
      registerExclusionElement={registerExclusionElement}
      exclusionRects={rects}
    >
      {children}
    </OverlayExclusionProvider>
  )
}
