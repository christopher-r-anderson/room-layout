import type { FocusEvent } from 'react'

/**
 * True when a blur leaves the element entirely rather than moving between its
 * descendants, so container-level focus tracking ignores internal moves.
 */
export function isFocusLeaving(event: FocusEvent<HTMLElement>): boolean {
  return (
    !(event.relatedTarget instanceof Node) ||
    !event.currentTarget.contains(event.relatedTarget)
  )
}
