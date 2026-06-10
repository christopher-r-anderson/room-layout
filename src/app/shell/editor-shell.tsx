import type { ReactNode } from 'react'
import { SelectedItemInteractionProvider } from '@/app/selection/selected-item-interaction-provider'
import { SelectionPlacementEngineProvider } from './selection-placement-engine-provider'
import { ShellLayoutServicesProvider } from './shell-layout-services-provider'

export interface EditorShellProps {
  isCatalogDrawerOpen: boolean
  startupOverlayActive: boolean
  syncLayoutMode: (layout: 'mobile' | 'desktop') => void
  children: ReactNode
}

export function EditorShell({
  isCatalogDrawerOpen,
  startupOverlayActive,
  syncLayoutMode,
  children,
}: EditorShellProps) {
  return (
    <ShellLayoutServicesProvider syncLayoutMode={syncLayoutMode}>
      <SelectionPlacementEngineProvider
        isCatalogDrawerOpen={isCatalogDrawerOpen}
        startupOverlayActive={startupOverlayActive}
      >
        <SelectedItemInteractionProvider>
          {children}
        </SelectedItemInteractionProvider>
      </SelectionPlacementEngineProvider>
    </ShellLayoutServicesProvider>
  )
}
