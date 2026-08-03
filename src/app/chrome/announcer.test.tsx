// @vitest-environment jsdom
import { beforeEach, expect, it } from 'vitest'
import { act, render } from '@/test/render'
import { feedback, resetFeedbackStore } from '@/core/stores/feedback-store'
import { Announcer } from './announcer'

// The DOM contract screen readers depend on: both channels exist (empty)
// before their first message - live regions only announce reliably when they
// are mounted before content arrives - and repeats render as fresh keyed
// nodes so they count as "additions" mutations and re-announce.

beforeEach(() => {
  resetFeedbackStore()
})

function renderAnnouncer() {
  const { container } = render(<Announcer />)
  const root = container.querySelector('[data-announcer-root]')
  const polite = container.querySelector('[data-announcer-channel="polite"]')
  const assertive = container.querySelector(
    '[data-announcer-channel="assertive"]',
  )

  if (
    !(root instanceof HTMLElement) ||
    !(polite instanceof HTMLElement) ||
    !(assertive instanceof HTMLElement)
  ) {
    throw new Error('announcer did not render its root and both channels')
  }

  return { root, polite, assertive }
}

it('mounts both channels empty with the live-region attributes', () => {
  const { root, polite, assertive } = renderAnnouncer()

  expect(root.classList.contains('sr-only')).toBe(true)

  expect(polite.getAttribute('aria-live')).toBe('polite')
  expect(polite.getAttribute('aria-atomic')).toBe('true')
  expect(polite.textContent).toBe('')

  expect(assertive.getAttribute('aria-live')).toBe('assertive')
  expect(assertive.getAttribute('aria-atomic')).toBe('true')
  expect(assertive.textContent).toBe('')
})

it('renders a polite feedback message into the polite channel only', () => {
  const { polite, assertive } = renderAnnouncer()

  act(() => {
    feedback.interactionUpdate('X')
  })

  expect(polite.textContent).toBe('X')
  expect(assertive.textContent).toBe('')
})

it('re-renders a repeated message as a fresh keyed node', () => {
  const { polite } = renderAnnouncer()

  act(() => {
    feedback.interactionUpdate('X')
  })
  const firstNode = polite.firstElementChild
  expect(firstNode).not.toBeNull()

  act(() => {
    feedback.interactionUpdate('X')
  })
  const secondNode = polite.firstElementChild

  // Same text, different DOM node: the nonce key forces a replacement, which
  // is what makes a screen reader speak the repeat.
  expect(secondNode).not.toBeNull()
  expect(secondNode).not.toBe(firstNode)
  expect(secondNode?.textContent).toBe('X')
})
