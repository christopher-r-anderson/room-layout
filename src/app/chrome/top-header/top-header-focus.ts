const HEADER_CONTROL_SELECTOR =
  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

function isEnabledHeaderControl(element: HTMLElement) {
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
function findNextEnabledHeaderControl(target: HTMLElement) {
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

function scheduleFocus(focus: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      focus()
    })
    return
  }

  queueMicrotask(focus)
}

/**
 * Stable keys for the header trigger controls that own focus return. There is
 * only ever one header mounted at a time, so a module-level registry lets the
 * focus-return logic reference live DOM nodes without threading refs through
 * the component tree or relying on `getElementById`.
 */
type HeaderFocusKey =
  | 'top-header-room'
  | 'top-header-more-actions'
  | 'top-header-start-over'

const nodes = new Map<HeaderFocusKey, HTMLElement>()

function register(key: HeaderFocusKey) {
  return (node: HTMLElement | null) => {
    if (node) {
      nodes.set(key, node)
    } else {
      nodes.delete(key)
    }
  }
}

/**
 * Focus the registered control for `key`. If it is missing or disabled, focus
 * the next enabled header control instead.
 */
function focus(key: HeaderFocusKey) {
  const node = nodes.get(key)

  if (!node) {
    return
  }

  scheduleFocus(() => {
    if (isEnabledHeaderControl(node)) {
      node.focus()
      return
    }

    findNextEnabledHeaderControl(node)?.focus()
  })
}

/**
 * Focus the next enabled control after the registered control for `key`. Used
 * when the originating control is expected to become disabled (e.g. Start Over
 * after the scene is reset).
 */
function focusNextEnabled(key: HeaderFocusKey) {
  const node = nodes.get(key)

  if (!node) {
    return
  }

  scheduleFocus(() => {
    findNextEnabledHeaderControl(node)?.focus()
  })
}

export const topHeaderFocusRegistry = {
  register,
  focus,
  focusNextEnabled,
}
