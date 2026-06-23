// @vitest-environment jsdom

import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  announcementActions,
  announcementStore,
  resetAnnouncementStore,
} from './announcement-store'

const polite = () => announcementStore.getState().politeAnnouncement
const assertive = () => announcementStore.getState().assertiveAnnouncement

describe('announcement store', () => {
  afterEach(() => {
    resetAnnouncementStore()
    vi.useRealTimers()
  })

  it('starts with empty polite and assertive announcements', () => {
    expect(polite()).toBe('')
    expect(assertive()).toBe('')
  })

  it('queues movement announcements with a delay', () => {
    vi.useFakeTimers()

    announcementActions.queueMovementAnnouncement('Moved to x 1.0, z 2.0.')
    expect(polite()).toBe('')

    vi.advanceTimersByTime(179)
    expect(polite()).toBe('')

    vi.advanceTimersByTime(1)
    // After 180ms the outer timer fires and clears the region, then schedules a
    // 0ms timer to set the message. Flush it so the announcement is visible.
    vi.runAllTimers()
    expect(polite()).toBe('Moved to x 1.0, z 2.0.')
  })

  it('re-announces when the same polite message is repeated', () => {
    vi.useFakeTimers()

    announcementActions.announcePolite('Coffee Table rotated.')
    vi.runAllTimers()
    expect(polite()).toBe('Coffee Table rotated.')

    // Announcing the same message again must produce a DOM mutation so screen
    // readers re-announce it. The intermediate '' clear ensures this.
    announcementActions.announcePolite('Coffee Table rotated.')
    expect(polite()).toBe('')

    vi.runAllTimers()
    expect(polite()).toBe('Coffee Table rotated.')
  })

  it('cancels queued movement announcements when announcePolite is called', () => {
    vi.useFakeTimers()

    announcementActions.queueMovementAnnouncement('Queued movement')
    announcementActions.announcePolite('Immediate selection')
    vi.runAllTimers()

    expect(polite()).toBe('Immediate selection')
  })

  it('clears queued movement announcements when assertive message updates', () => {
    vi.useFakeTimers()

    announcementActions.queueMovementAnnouncement('Queued movement')
    announcementActions.announceAssertive('Asset load error')
    vi.runAllTimers()

    expect(assertive()).toBe('Asset load error')
    expect(polite()).toBe('')

    announcementActions.clearAssertiveAnnouncement()
    expect(assertive()).toBe('')
  })

  it('re-announces when the same assertive message is repeated', () => {
    vi.useFakeTimers()

    announcementActions.announceAssertive(
      'Unable to load room editor assets. Retry available.',
    )
    vi.runAllTimers()
    expect(assertive()).toBe(
      'Unable to load room editor assets. Retry available.',
    )

    announcementActions.announceAssertive(
      'Unable to load room editor assets. Retry available.',
    )
    expect(assertive()).toBe('')

    vi.runAllTimers()
    expect(assertive()).toBe(
      'Unable to load room editor assets. Retry available.',
    )
  })

  it('cancels the pending inner set-timer when clearQueuedMovementAnnouncement fires after the 180ms outer timer', () => {
    vi.useFakeTimers()

    announcementActions.queueMovementAnnouncement('Moved to x 1.0, z 2.0.')

    // Advance past the 180ms outer timer so it fires and schedules the 0ms inner timer.
    vi.advanceTimersByTime(180)
    // Live region is cleared; inner timer is now pending.
    expect(polite()).toBe('')

    // Cancel arrives in the ~0ms window before the inner timer drains.
    announcementActions.clearQueuedMovementAnnouncement()
    vi.runAllTimers()

    // Inner timer was cancelled — live region must stay empty.
    expect(polite()).toBe('')
  })

  it('cancels the pending assertive set-timer when clearAssertiveAnnouncement fires before it drains', () => {
    vi.useFakeTimers()

    announcementActions.announceAssertive('Asset load error')
    // '' clear has committed; inner timer is pending.
    expect(assertive()).toBe('')

    announcementActions.clearAssertiveAnnouncement()
    vi.runAllTimers()

    // Inner timer was cancelled — live region stays empty.
    expect(assertive()).toBe('')
  })

  it('cancels pending timers on reset', () => {
    vi.useFakeTimers()

    const clearTimeoutSpy = vi.spyOn(window, 'clearTimeout')

    announcementActions.queueMovementAnnouncement('Queued movement')
    announcementActions.announceAssertive('Assertive message')

    resetAnnouncementStore()

    expect(clearTimeoutSpy).toHaveBeenCalled()
  })
})
