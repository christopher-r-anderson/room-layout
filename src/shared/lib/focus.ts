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

// Excludes tabindex="-1" on every clause, not just the [tabindex] one, so in a
// roving-tabindex toolbar the query lands on the active (tabindex="0") item
// rather than the first DOM button (which may be roving-inactive).
const FOCUSABLE_CONTROL_SELECTOR =
  'button:not([disabled]):not([tabindex="-1"]), input:not([disabled]):not([tabindex="-1"]), select:not([disabled]):not([tabindex="-1"]), textarea:not([disabled]):not([tabindex="-1"]), [tabindex]:not([tabindex="-1"])'

// A roving composite that has not assigned its active item yet has every
// control on tabindex="-1"; programmatic focus still works and the composite
// adopts the focused item, so fall back to the first enabled control.
const ANY_CONTROL_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]'

/**
 * True for a zero-detail click - one not produced by a pointer press:
 * `detail` is the click count, so Enter/Space activation and programmatic
 * element.click() report 0. The focus policy treats zero-detail as keyboard
 * modality.
 */
export function isKeyboardActivatedClick(event: { detail: number }): boolean {
  return event.detail === 0
}

/** Focuses the first focusable control under root; false when none exists. */
export function focusFirstControl(root: ParentNode | null): boolean {
  const control =
    root?.querySelector<HTMLElement>(FOCUSABLE_CONTROL_SELECTOR) ??
    root?.querySelector<HTMLElement>(ANY_CONTROL_SELECTOR) ??
    null

  if (control === null) {
    return false
  }

  control.focus()
  return true
}
