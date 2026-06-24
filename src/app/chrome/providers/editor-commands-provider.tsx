import type { ReactNode } from 'react'
import { useCommandDispatchValue } from '@/core/commands/command-dispatch-context'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'
import { useEditorCommandHandlers } from '@/app/commands/use-editor-command-handlers'

/**
 * Builds the editor command dispatch inside the provider tree — the handler map
 * reads the editor refs from context — and provides it to the subtree. Lives
 * here so App no longer assembles dispatch itself.
 */
export function EditorCommandsProvider({ children }: { children: ReactNode }) {
  const commandHandlers = useEditorCommandHandlers()
  const dispatchCommand = useCommandDispatchValue(commandHandlers)

  return (
    <CommandDispatchProvider value={dispatchCommand}>
      {children}
    </CommandDispatchProvider>
  )
}
