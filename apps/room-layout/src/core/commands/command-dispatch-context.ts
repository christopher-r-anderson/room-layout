import { createContext, useContext } from 'react'
import type { EditorCommand } from './editor-command'

export type CommandDispatch = (command: EditorCommand) => void

export const CommandDispatchContext = createContext<CommandDispatch | null>(
  null,
)

export function useCommandDispatch(): CommandDispatch {
  const value = useContext(CommandDispatchContext)

  if (value === null) {
    throw new Error(
      'useCommandDispatch must be used within a CommandDispatchProvider.',
    )
  }

  return value
}
