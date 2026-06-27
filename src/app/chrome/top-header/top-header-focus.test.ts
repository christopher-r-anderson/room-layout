// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { topHeaderFocusRegistry } from './top-header-focus'

const KEYS = [
  'top-header-room',
  'top-header-more-actions',
  'top-header-start-over',
] as const

function setupHeader(innerHtml: string) {
  document.body.innerHTML = `<div data-top-header-root>${innerHtml}</div>`
}

beforeEach(() => {
  // Focus is scheduled on the next animation frame; run it synchronously so the
  // assertions can read document.activeElement immediately.
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(0)
    return 0
  })
})

afterEach(() => {
  vi.restoreAllMocks()
  // The registry is a module-level singleton — unregister between tests.
  for (const key of KEYS) {
    topHeaderFocusRegistry.register(key)(null)
  }
  document.body.innerHTML = ''
})

describe('topHeaderFocusRegistry.focus', () => {
  it('focuses the registered control when it is enabled', () => {
    setupHeader(
      '<button id="room">Room</button><button id="more">More</button>',
    )
    const room = document.getElementById('room')
    topHeaderFocusRegistry.register('top-header-room')(room)

    topHeaderFocusRegistry.focus('top-header-room')

    expect(document.activeElement).toBe(room)
  })

  it('falls back to the next enabled control when the registered one is disabled', () => {
    setupHeader(
      '<button id="room" disabled>Room</button><button id="more">More</button>',
    )
    const room = document.getElementById('room')
    const more = document.getElementById('more')
    topHeaderFocusRegistry.register('top-header-room')(room)

    topHeaderFocusRegistry.focus('top-header-room')

    expect(document.activeElement).toBe(more)
  })

  it('does nothing when the key is not registered', () => {
    setupHeader('<button id="room">Room</button>')

    topHeaderFocusRegistry.focus('top-header-room')

    expect(document.activeElement).toBe(document.body)
  })
})

describe('topHeaderFocusRegistry.focusNextEnabled', () => {
  it('skips the registered control even when it is enabled', () => {
    setupHeader(
      '<button id="room">Room</button><button id="more">More</button>',
    )
    const room = document.getElementById('room')
    const more = document.getElementById('more')
    topHeaderFocusRegistry.register('top-header-room')(room)

    topHeaderFocusRegistry.focusNextEnabled('top-header-room')

    expect(document.activeElement).toBe(more)
  })

  it('skips disabled, aria-disabled, aria-hidden, and inert controls', () => {
    setupHeader(
      [
        '<button id="room">Room</button>',
        '<button id="aria-off" aria-disabled="true">Off</button>',
        '<span aria-hidden="true"><button id="hidden">Hidden</button></span>',
        '<div inert><button id="inert">Inert</button></div>',
        '<button id="more">More</button>',
      ].join(''),
    )
    const room = document.getElementById('room')
    const more = document.getElementById('more')
    topHeaderFocusRegistry.register('top-header-room')(room)

    topHeaderFocusRegistry.focusNextEnabled('top-header-room')

    expect(document.activeElement).toBe(more)
  })

  it('walks backward when no enabled control follows the registered one', () => {
    setupHeader(
      [
        '<button id="first">First</button>',
        '<button id="mid">Mid</button>',
        '<button id="last" disabled>Last</button>',
      ].join(''),
    )
    const first = document.getElementById('first')
    const mid = document.getElementById('mid')
    topHeaderFocusRegistry.register('top-header-more-actions')(mid)

    topHeaderFocusRegistry.focusNextEnabled('top-header-more-actions')

    expect(document.activeElement).toBe(first)
  })

  it('treats tabindex="-1" as non-focusable but custom tabindex as focusable', () => {
    setupHeader(
      [
        '<button id="room">Room</button>',
        '<div id="skip" tabindex="-1">Skip</div>',
        '<div id="custom" tabindex="0">Custom</div>',
      ].join(''),
    )
    const room = document.getElementById('room')
    const custom = document.getElementById('custom')
    topHeaderFocusRegistry.register('top-header-room')(room)

    topHeaderFocusRegistry.focusNextEnabled('top-header-room')

    expect(document.activeElement).toBe(custom)
  })
})
