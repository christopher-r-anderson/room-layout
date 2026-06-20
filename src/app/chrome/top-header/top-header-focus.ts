const HEADER_CONTROL_SELECTOR =
  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

export function isEnabledHeaderControl(element: HTMLElement) {
  if (element.matches('[disabled], [aria-disabled="true"]')) {
    return false
  }

  if (element.closest('[aria-hidden="true"], [inert]')) {
    return false
  }

  return true
}

/**
 * Find the next enabled header control after `target`, walking forward first
 * and then backward within the same header root. Used when the originating
 * control is missing or has become disabled (e.g. the Start Over button after
 * the scene is reset).
 */
export function findNextEnabledHeaderControl(target: HTMLElement) {
  const headerRoot = target.closest<HTMLElement>('[data-top-header-root]')

  if (!headerRoot) {
    return null
  }

  const controls = Array.from(
    headerRoot.querySelectorAll<HTMLElement>(HEADER_CONTROL_SELECTOR),
  )

  if (controls.length === 0) {
    return null
  }

  const targetIndex = controls.indexOf(target)

  if (targetIndex === -1) {
    return controls.find(isEnabledHeaderControl) ?? null
  }

  for (let index = targetIndex + 1; index < controls.length; index += 1) {
    const candidate = controls[index]

    if (isEnabledHeaderControl(candidate)) {
      return candidate
    }
  }

  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const candidate = controls[index]

    if (isEnabledHeaderControl(candidate)) {
      return candidate
    }
  }

  return null
}

export function scheduleFocus(focus: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      focus()
    })
    return
  }

  queueMicrotask(focus)
}
