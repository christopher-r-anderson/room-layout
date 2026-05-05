// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useAnnouncements } from './use-announcements'

describe('useAnnouncements', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts with empty polite and assertive announcements', () => {
    const { result } = renderHook(() => useAnnouncements())

    expect(result.current.politeAnnouncement).toBe('')
    expect(result.current.assertiveAnnouncement).toBe('')
  })

  it('queues movement announcements with a delay', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useAnnouncements())

    act(() => {
      result.current.queueMovementAnnouncement('Moved to x 1.0, z 2.0.')
    })

    expect(result.current.politeAnnouncement).toBe('')

    act(() => {
      vi.advanceTimersByTime(179)
    })
    expect(result.current.politeAnnouncement).toBe('')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    // After 180ms the outer timer fires and clears the region, then schedules a
    // 0ms timer to set the message. Flush it so the announcement is visible.
    act(() => {
      vi.runAllTimers()
    })
    expect(result.current.politeAnnouncement).toBe('Moved to x 1.0, z 2.0.')
  })

  it('re-announces when the same polite message is repeated', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useAnnouncements())

    act(() => {
      result.current.announcePolite('Coffee Table rotated.')
      vi.runAllTimers()
    })
    expect(result.current.politeAnnouncement).toBe('Coffee Table rotated.')

    // Announcing the same message again must produce a DOM mutation so screen
    // readers re-announce it. The intermediate '' clear ensures this.
    act(() => {
      result.current.announcePolite('Coffee Table rotated.')
    })
    expect(result.current.politeAnnouncement).toBe('')

    act(() => {
      vi.runAllTimers()
    })
    expect(result.current.politeAnnouncement).toBe('Coffee Table rotated.')
  })

  it('cancels queued movement announcements when announcePolite is called', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useAnnouncements())

    act(() => {
      result.current.queueMovementAnnouncement('Queued movement')
      result.current.announcePolite('Immediate selection')
      vi.runAllTimers()
    })

    expect(result.current.politeAnnouncement).toBe('Immediate selection')
  })

  it('clears queued movement announcements when assertive message updates', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useAnnouncements())

    act(() => {
      result.current.queueMovementAnnouncement('Queued movement')
      result.current.announceAssertive('Asset load error')
      vi.runAllTimers()
    })

    expect(result.current.assertiveAnnouncement).toBe('Asset load error')
    expect(result.current.politeAnnouncement).toBe('')

    act(() => {
      result.current.clearAssertiveAnnouncement()
    })
    expect(result.current.assertiveAnnouncement).toBe('')
  })

  it('re-announces when the same assertive message is repeated', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useAnnouncements())

    act(() => {
      result.current.announceAssertive(
        'Unable to load room editor assets. Retry available.',
      )
      vi.runAllTimers()
    })
    expect(result.current.assertiveAnnouncement).toBe(
      'Unable to load room editor assets. Retry available.',
    )

    act(() => {
      result.current.announceAssertive(
        'Unable to load room editor assets. Retry available.',
      )
    })
    expect(result.current.assertiveAnnouncement).toBe('')

    act(() => {
      vi.runAllTimers()
    })
    expect(result.current.assertiveAnnouncement).toBe(
      'Unable to load room editor assets. Retry available.',
    )
  })

  it('cancels the pending inner set-timer when clearQueuedMovementAnnouncement fires after the 180ms outer timer', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useAnnouncements())

    act(() => {
      result.current.queueMovementAnnouncement('Moved to x 1.0, z 2.0.')
    })

    // Advance past the 180ms outer timer so it fires and schedules the 0ms inner timer.
    act(() => {
      vi.advanceTimersByTime(180)
    })
    // Live region is cleared; inner timer is now pending.
    expect(result.current.politeAnnouncement).toBe('')

    // Cancel arrives in the ~0ms window before the inner timer drains.
    act(() => {
      result.current.clearQueuedMovementAnnouncement()
      vi.runAllTimers()
    })

    // Inner timer was cancelled — live region must stay empty.
    expect(result.current.politeAnnouncement).toBe('')
  })

  it('cancels the pending assertive set-timer when clearAssertiveAnnouncement fires before it drains', () => {
    vi.useFakeTimers()

    const { result } = renderHook(() => useAnnouncements())

    act(() => {
      result.current.announceAssertive('Asset load error')
    })
    // '' clear has committed; inner timer is pending.
    expect(result.current.assertiveAnnouncement).toBe('')

    act(() => {
      result.current.clearAssertiveAnnouncement()
      vi.runAllTimers()
    })

    // Inner timer was cancelled — live region stays empty.
    expect(result.current.assertiveAnnouncement).toBe('')
  })
})
