// @vitest-environment jsdom

import { render } from '@/test/render'
import { describe, expect, it } from 'vitest'

import { KbdShortcutDisplay } from './keyboard-shortcut-display'

describe('KbdShortcutDisplay', () => {
  it('renders a single-key shortcut as one key with no separators', () => {
    const { container } = render(<KbdShortcutDisplay shortcuts="F" />)

    expect(container).toHaveTextContent(/^F$/)
    expect(container.querySelectorAll('[data-slot="kbd"]')).toHaveLength(1)
    expect(container.querySelector('[data-slot="kbd-group"]')).toBeNull()
  })

  it('joins combination keys with "+" inside one group', () => {
    const { container } = render(<KbdShortcutDisplay shortcuts="Control+Z" />)

    expect(container).toHaveTextContent('Control+Z')
    const group = container.querySelector('[data-slot="kbd-group"]')
    expect(group).not.toBeNull()
    expect(group?.querySelectorAll('[data-slot="kbd"]')).toHaveLength(2)
  })

  it('separates alternative shortcuts with "or"', () => {
    const { container } = render(<KbdShortcutDisplay shortcuts="F Shift+T" />)

    expect(container).toHaveTextContent('F or Shift+T')
    expect(container.querySelectorAll('[data-slot="kbd"]')).toHaveLength(3)
  })

  it('renders nothing when there is no shortcut', () => {
    const { container } = render(<KbdShortcutDisplay shortcuts={undefined} />)

    expect(container).toBeEmptyDOMElement()
  })
})
