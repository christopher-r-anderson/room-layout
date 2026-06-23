import type { ReactNode } from 'react'
import {
  CommandDispatchContext,
  type CommandDispatch,
} from './command-dispatch-context'

export function CommandDispatchProvider(props: {
  value: CommandDispatch
  children: ReactNode
}) {
  return (
    <CommandDispatchContext.Provider value={props.value}>
      {props.children}
    </CommandDispatchContext.Provider>
  )
}
