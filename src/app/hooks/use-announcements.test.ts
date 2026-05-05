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
    expect(result.current.politeAnnouncement).toBe('Moved to x 1.0, z 2.0.')
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
})
