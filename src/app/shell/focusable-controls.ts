export const FOCUSABLE_CONTROLS_SELECTOR =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

export function findFirstFocusableControl(root: ParentNode | null) {
  return root?.querySelector<HTMLElement>(FOCUSABLE_CONTROLS_SELECTOR) ?? null
}
