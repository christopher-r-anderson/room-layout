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
  type EditorCommandApi,
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
 * Builds a stable dispatch from a per-render command api. The api is rebuilt
 * each render (it closes over fresh handlers), so we keep it in a ref synced in
 * a layout effect and expose a referentially stable dispatch that reads the
 * latest api at call time.
 */
export function useCommandDispatchValue(
  api: EditorCommandApi,
): CommandDispatch {
  const apiRef = useRef(api)

  useLayoutEffect(() => {
    apiRef.current = api
  }, [api])

  return useCallback((command: EditorCommand) => {
    runEditorCommand(command, apiRef.current)
  }, [])
}
