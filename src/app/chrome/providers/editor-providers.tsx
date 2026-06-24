import type { ReactNode } from 'react'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { EditorRefsProvider } from '@/shared/providers/editor-refs-provider'
import type { EditorRefs } from '@/shared/providers/editor-refs-context'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'
import type { CommandDispatch } from '@/core/commands/command-dispatch-context'
import { SelectedItemInteractionProvider } from '@/features/selection/selected-item-interaction-provider'
import { SelectionPlacementEngineProvider } from './selection-placement-engine-provider'
import { ShellLayoutServicesProvider } from './shell-layout-services-provider'

export interface EditorProvidersProps {
  editorRefs: EditorRefs
  dispatchCommand: CommandDispatch
  children: ReactNode
}

/**
 * The editor's single provider-composition root. App builds the values that
 * depend on its state (the editor refs and the command dispatch) and supplies
 * them here; every provider lives in one place, in one order.
 */
export function EditorProviders({
  editorRefs,
  dispatchCommand,
  children,
}: EditorProvidersProps) {
  return (
    <TooltipProvider>
      <EditorRefsProvider value={editorRefs}>
        <CommandDispatchProvider value={dispatchCommand}>
          <ShellLayoutServicesProvider>
            <SelectionPlacementEngineProvider>
              <SelectedItemInteractionProvider>
                {children}
              </SelectedItemInteractionProvider>
            </SelectionPlacementEngineProvider>
          </ShellLayoutServicesProvider>
        </CommandDispatchProvider>
      </EditorRefsProvider>
    </TooltipProvider>
  )
}
