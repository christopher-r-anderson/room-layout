import type { ReactNode } from 'react'
import { SelectedItemInteractionProvider } from '@/features/selection/selected-item-interaction-provider'
import { SelectionPlacementEngineProvider } from './selection-placement-engine-provider'
import { ShellLayoutServicesProvider } from './shell-layout-services-provider'

export interface EditorShellProps {
  children: ReactNode
}

export function EditorShell({ children }: EditorShellProps) {
  return (
    <ShellLayoutServicesProvider>
      <SelectionPlacementEngineProvider>
        <SelectedItemInteractionProvider>
          {children}
        </SelectedItemInteractionProvider>
      </SelectionPlacementEngineProvider>
    </ShellLayoutServicesProvider>
  )
}
