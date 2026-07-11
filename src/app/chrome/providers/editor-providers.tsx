import { type ReactNode } from 'react'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { SelectedItemInteractionProvider } from '@/features/selection/selected-item-interaction-provider'
import { EditorCommandsProvider } from './editor-commands-provider'
import { SelectionPlacementEngineProvider } from './selection-placement-engine-provider'
import { ShellLayoutServicesProvider } from './shell-layout-services-provider'

/**
 * The editor's single provider-composition root: it builds the command
 * dispatch (via EditorCommandsProvider) so App is left as bootstrap and
 * render.
 */
export function EditorProviders({ children }: { children: ReactNode }) {
  return (
    // Hover tooltips wait briefly so cursor passes over the toolbars don't pop
    // every tip; keyboard focus still opens them immediately.
    <TooltipProvider delay={400}>
      <EditorCommandsProvider>
        <ShellLayoutServicesProvider>
          <SelectionPlacementEngineProvider>
            <SelectedItemInteractionProvider>
              {children}
            </SelectedItemInteractionProvider>
          </SelectionPlacementEngineProvider>
        </ShellLayoutServicesProvider>
      </EditorCommandsProvider>
    </TooltipProvider>
  )
}
