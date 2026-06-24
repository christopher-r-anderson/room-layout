import {
  createContext,
  useCallback,
  useContext,
  useLayoutEffect,
  useRef,
} from 'react'
import {
  runEditorCommand,
  type EditorCommand,
  type EditorCommandHandlers,
} from './editor-command'

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

/**
 * Builds a stable dispatch from a per-render handler map. The map is rebuilt
 * each render (some handlers close over fresh component state), so we keep it in
 * a ref synced in a layout effect and expose a referentially stable dispatch
 * that reads the latest handlers at call time.
 */
export function useCommandDispatchValue(
  handlers: EditorCommandHandlers,
): CommandDispatch {
  const handlersRef = useRef(handlers)

  useLayoutEffect(() => {
    handlersRef.current = handlers
  }, [handlers])

  return useCallback((command: EditorCommand) => {
    runEditorCommand(command, handlersRef.current)
  }, [])
}
