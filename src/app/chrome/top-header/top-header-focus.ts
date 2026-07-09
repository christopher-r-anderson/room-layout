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
type HeaderFocusKey = 'top-header-room' | 'top-header-more-actions'

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
 * Focus the registered control for `key`. Used where the library cannot restore
 * focus itself because the trigger has unmounted (the mobile More actions
 * drawer) or lives outside the closing surface (the desktop room sidebar). The
 * registered controls are never disabled, so no enabled-fallback is needed.
 */
function focus(key: HeaderFocusKey) {
  const node = nodes.get(key)

  if (!node) {
    return
  }

  scheduleFocus(() => {
    node.focus()
  })
}

export const topHeaderFocusRegistry = {
  register,
  focus,
}
