import type { ReactNode } from 'react'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'
import { dispatchEditorCommand } from '@/app/commands/editor-command-handlers'

/**
 * Provides the editor command dispatch to the subtree. The handler map is a
 * module constant (no handler closes over component state), so the dispatch is
 * a plain function.
 */
export function EditorCommandsProvider({ children }: { children: ReactNode }) {
  return (
    <CommandDispatchProvider value={dispatchEditorCommand}>
      {children}
    </CommandDispatchProvider>
  )
}
