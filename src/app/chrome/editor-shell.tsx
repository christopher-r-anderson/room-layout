import type { ReactNode } from 'react'
import { SelectedItemInteractionProvider } from '@/features/selection/selected-item-interaction-provider'
import { SelectionPlacementEngineProvider } from './selection-placement-engine-provider'
import { ShellLayoutServicesProvider } from './shell-layout-services-provider'
import type { HeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'

export interface EditorShellProps {
  isCatalogDrawerOpen: boolean
  startupOverlayActive: boolean
  syncLayoutMode: (layout: HeaderLayoutMode) => void
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
