import {
  findNextEnabledHeaderControl,
  isEnabledHeaderControl,
  scheduleFocus,
} from './top-header-focus'

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

export const headerFocusRegistry = {
  register,
  focus,
  focusNextEnabled,
}
