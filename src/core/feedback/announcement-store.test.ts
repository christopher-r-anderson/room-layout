// @vitest-environment jsdom

import { afterEach, expect, it, vi } from 'vitest'
import {
  announceAssertive,
  announcePolite,
  announcementStoreForTests,
  queueMovementAnnouncement,
  resetAnnouncements,
  type Announcement,
} from './announcement-store'

const polite = (): Announcement => announcementStoreForTests.getState().polite
const assertive = (): Announcement =>
  announcementStoreForTests.getState().assertive

afterEach(() => {
  resetAnnouncements()
  vi.useRealTimers()
})

it('starts with empty polite and assertive channels', () => {
  expect(polite().text).toBe('')
  expect(assertive().text).toBe('')
})

it('announces polite and assertive messages synchronously', () => {
  announcePolite('Chair selected.')
  announceAssertive('Rotation must be a valid number.')

  expect(polite().text).toBe('Chair selected.')
  expect(assertive().text).toBe('Rotation must be a valid number.')
})

it('re-announces a repeated polite message with a fresh nonce', () => {
  announcePolite('Coffee Table rotated.')
  const firstNonce = polite().nonce

  // Repeating the same text must still register as a new announcement for
  // screen readers: the text stays equal while the nonce strictly increases.
  announcePolite('Coffee Table rotated.')

  expect(polite().text).toBe('Coffee Table rotated.')
  expect(polite().nonce).toBeGreaterThan(firstNonce)
})

it('re-announces a repeated assertive message with a fresh nonce', () => {
  announceAssertive('Rotation must be a valid number.')
  const firstNonce = assertive().nonce

  announceAssertive('Rotation must be a valid number.')

  expect(assertive().text).toBe('Rotation must be a valid number.')
  expect(assertive().nonce).toBeGreaterThan(firstNonce)
})

it('delays queued movement announcements by 180ms', () => {
  vi.useFakeTimers()

  queueMovementAnnouncement('Moved to x 1.0, z 2.0.')
  expect(polite().text).toBe('')

  vi.advanceTimersByTime(179)
  expect(polite().text).toBe('')

  vi.advanceTimersByTime(1)
  expect(polite().text).toBe('Moved to x 1.0, z 2.0.')
})

it('announces only the last movement message queued inside the debounce window', () => {
  vi.useFakeTimers()

  queueMovementAnnouncement('Moved to x 1.0, z 2.0.')
  vi.advanceTimersByTime(100)
  queueMovementAnnouncement('Moved to x 2.0, z 2.0.')

  vi.runAllTimers()

  expect(polite().text).toBe('Moved to x 2.0, z 2.0.')
})

it('cancels a queued movement announcement when a polite message lands first', () => {
  vi.useFakeTimers()

  queueMovementAnnouncement('Queued movement')
  announcePolite('Immediate selection')
  vi.runAllTimers()

  expect(polite().text).toBe('Immediate selection')
})

it('cancels a queued movement announcement when an assertive message lands first', () => {
  vi.useFakeTimers()

  queueMovementAnnouncement('Queued movement')
  announceAssertive('Asset load error')
  vi.runAllTimers()

  expect(assertive().text).toBe('Asset load error')
  expect(polite().text).toBe('')
})

it('clears both channels and any pending movement announcement on reset', () => {
  vi.useFakeTimers()

  announcePolite('Chair selected.')
  announceAssertive('Assertive message')
  queueMovementAnnouncement('Queued movement')

  resetAnnouncements()

  expect(polite().text).toBe('')
  expect(assertive().text).toBe('')

  vi.runAllTimers()

  // The debounce scheduled before the reset must not repopulate the channels.
  expect(polite().text).toBe('')
  expect(assertive().text).toBe('')
})
