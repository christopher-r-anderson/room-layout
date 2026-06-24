import { useMemo, useRef, type ReactNode } from 'react'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { EditorRefsProvider } from '@/shared/providers/editor-refs-provider'
import { SelectedItemInteractionProvider } from '@/features/selection/selected-item-interaction-provider'
import { EditorCommandsProvider } from './editor-commands-provider'
import { SelectionPlacementEngineProvider } from './selection-placement-engine-provider'
import { ShellLayoutServicesProvider } from './shell-layout-services-provider'

/**
 * The editor's single provider-composition root. It owns the editor refs and
 * builds the command dispatch (inside the refs provider, via
 * EditorCommandsProvider) so App is left as bootstrap and render.
 */
export function EditorProviders({ children }: { children: ReactNode }) {
  const roomViewRef = useRef<HTMLElement | null>(null)
  const dockedInspectorRef = useRef<HTMLDivElement | null>(null)
  const editorRefs = useMemo(() => ({ roomViewRef, dockedInspectorRef }), [])

  return (
    <TooltipProvider>
      <EditorRefsProvider value={editorRefs}>
        <EditorCommandsProvider>
          <ShellLayoutServicesProvider>
            <SelectionPlacementEngineProvider>
              <SelectedItemInteractionProvider>
                {children}
              </SelectedItemInteractionProvider>
            </SelectionPlacementEngineProvider>
          </ShellLayoutServicesProvider>
        </EditorCommandsProvider>
      </EditorRefsProvider>
    </TooltipProvider>
  )
}
