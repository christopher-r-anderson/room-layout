// @vitest-environment jsdom
import {
  afterEach,
  beforeEach,
  expect,
  it,
  vi,
  type MockInstance,
} from 'vitest'
import { appToastManager } from './toast-manager'
import { feedback } from './feedback'
import {
  announcementStoreForTests,
  resetAnnouncements,
} from './announcement-store'

// The routing contract: each entry point fires exactly one surface set. The
// negative assertions are the point - they are what keeps a second channel
// from quietly creeping back in. Normative table in
// docs/architecture/feedback.md; browser twin in e2e/feedback-routing.spec.ts.

const channels = () => announcementStoreForTests.getState()

let addToast: MockInstance<typeof appToastManager.add>

beforeEach(() => {
  resetAnnouncements()
  addToast = vi.spyOn(appToastManager, 'add').mockReturnValue('toast-1')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

it.each([
  ['actionSuccess', { type: 'success', priority: 'low' }],
  ['actionWarning', { type: 'warning', priority: 'low', timeout: 8_000 }],
  ['actionError', { type: 'error', priority: 'high', timeout: 0 }],
] as const)(
  '%s raises one toast and leaves both SR channels silent',
  (entry, expected) => {
    feedback[entry]({ title: 'Outcome', description: 'Detail' })

    expect(addToast).toHaveBeenCalledExactlyOnceWith(
      expect.objectContaining({
        title: 'Outcome',
        description: 'Detail',
        ...expected,
      }),
    )
    expect(channels().polite.text).toBe('')
    expect(channels().assertive.text).toBe('')
  },
)

it('interactionUpdate announces politely only', () => {
  feedback.interactionUpdate('Chair selected.')

  expect(channels().polite.text).toBe('Chair selected.')
  expect(channels().assertive.text).toBe('')
  expect(addToast).not.toHaveBeenCalled()
})

it('formError announces assertively only', () => {
  feedback.formError('Distance must be a number.')

  expect(channels().assertive.text).toBe('Distance must be a number.')
  expect(channels().polite.text).toBe('')
  expect(addToast).not.toHaveBeenCalled()
})

it('movementUpdate debounces onto the polite channel', () => {
  vi.useFakeTimers()

  feedback.movementUpdate('Chair moved to X 1 and Z 2.')
  feedback.movementUpdate('Chair moved to X 1 and Z 3.')
  expect(channels().polite.text).toBe('')

  vi.runAllTimers()

  expect(channels().polite.text).toBe('Chair moved to X 1 and Z 3.')
  expect(addToast).not.toHaveBeenCalled()
})

it.each([
  [
    'actionError',
    () => {
      feedback.actionError({ title: 'Failed.' })
    },
  ],
  [
    'interactionUpdate',
    () => {
      feedback.interactionUpdate('Chair rotated.')
    },
  ],
  [
    'formError',
    () => {
      feedback.formError('Invalid.')
    },
  ],
] as const)('%s cancels a queued movement announcement', (_entry, fire) => {
  vi.useFakeTimers()

  feedback.movementUpdate('Stale position.')
  fire()
  vi.runAllTimers()

  expect(channels().polite.text).not.toBe('Stale position.')
})

it('repeating a message re-announces through a fresh nonce', () => {
  feedback.interactionUpdate('Undo complete.')
  const first = channels().polite

  feedback.interactionUpdate('Undo complete.')
  const second = channels().polite

  expect(second.text).toBe(first.text)
  expect(second.nonce).toBeGreaterThan(first.nonce)
})

it('reset clears both channels and the pending debounce', () => {
  vi.useFakeTimers()

  feedback.interactionUpdate('Chair selected.')
  feedback.formError('Invalid.')
  feedback.movementUpdate('Pending move.')

  feedback.reset()
  vi.runAllTimers()

  expect(channels().polite.text).toBe('')
  expect(channels().assertive.text).toBe('')
})
