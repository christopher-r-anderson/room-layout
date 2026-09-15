// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { topHeaderFocusRegistry } from './top-header-focus'

const KEYS = ['top-header-room', 'top-header-more-actions'] as const

function setupHeader(innerHtml: string) {
  document.body.innerHTML = `<div>${innerHtml}</div>`
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
  // The registry is a module-level singleton - unregister between tests.
  for (const key of KEYS) {
    topHeaderFocusRegistry.register(key)(null)
  }
  document.body.innerHTML = ''
})

describe('topHeaderFocusRegistry.focus', () => {
  it('focuses the registered control', () => {
    setupHeader(
      '<button id="room">Room</button><button id="more">More</button>',
    )
    const room = document.getElementById('room')
    topHeaderFocusRegistry.register('top-header-room')(room)

    topHeaderFocusRegistry.focus('top-header-room')

    expect(document.activeElement).toBe(room)
  })

  it('does nothing when the key is not registered', () => {
    setupHeader('<button id="room">Room</button>')

    topHeaderFocusRegistry.focus('top-header-room')

    expect(document.activeElement).toBe(document.body)
  })
})
