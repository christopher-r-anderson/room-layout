function scheduleFocus(focus: () => void) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(() => {
      focus()
    })
    return
  }

  queueMicrotask(focus)
}

// One header is mounted at a time, so a module-level registry can hand live DOM
// nodes to focus-return code without threading refs through the tree.
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
