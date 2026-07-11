// The minimal blur-event shape, so both React synthetic events and native
// focusout events fit without coupling this module to React types.
interface FocusTransferEvent {
  currentTarget: HTMLElement
  relatedTarget: EventTarget | null
}

/**
 * True when a blur leaves the element entirely rather than moving between its
 * descendants, so container-level focus tracking ignores internal moves.
 */
export function isFocusLeaving(event: FocusTransferEvent): boolean {
  return (
    !(event.relatedTarget instanceof Node) ||
    !event.currentTarget.contains(event.relatedTarget)
  )
}
