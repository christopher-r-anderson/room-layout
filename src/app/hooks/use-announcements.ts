import { useCallback, useRef, useState } from 'react'

const MOVEMENT_ANNOUNCEMENT_DELAY_MS = 180

interface Announcements {
  politeAnnouncement: string
  assertiveAnnouncement: string
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  clearAssertiveAnnouncement: () => void
  queueMovementAnnouncement: (message: string) => void
  clearQueuedMovementAnnouncement: () => void
}

export function useAnnouncements(): Announcements {
  const [politeAnnouncement, setPoliteAnnouncement] = useState('')
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('')
  const movementAnnouncementTimeoutRef = useRef<number | null>(null)
  const pendingPoliteSetRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pendingAssertiveSetRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  )

  const clearQueuedMovementAnnouncement = useCallback(() => {
    if (movementAnnouncementTimeoutRef.current !== null) {
      window.clearTimeout(movementAnnouncementTimeoutRef.current)
      movementAnnouncementTimeoutRef.current = null
    }

    // Also cancel the inner 0 ms set-timer that the movement callback may have
    // already scheduled before this cancel arrived.
    if (pendingPoliteSetRef.current !== null) {
      clearTimeout(pendingPoliteSetRef.current)
      pendingPoliteSetRef.current = null
    }
  }, [])

  const announcePolite = useCallback(
    (message: string) => {
      if (!message) {
        return
      }

      clearQueuedMovementAnnouncement()
      // Clear first so screen readers re-announce when the same message repeats.
      // The '' update commits in the current task; the deferred callback runs in
      // a separate task, guaranteeing two distinct DOM mutations.
      if (pendingPoliteSetRef.current !== null) {
        clearTimeout(pendingPoliteSetRef.current)
      }
      setPoliteAnnouncement('')
      pendingPoliteSetRef.current = setTimeout(() => {
        pendingPoliteSetRef.current = null
        setPoliteAnnouncement(message)
      }, 0)
    },
    [clearQueuedMovementAnnouncement],
  )

  const queueMovementAnnouncement = useCallback(
    (message: string) => {
      if (!message) {
        return
      }

      clearQueuedMovementAnnouncement()

      movementAnnouncementTimeoutRef.current = window.setTimeout(() => {
        movementAnnouncementTimeoutRef.current = null
        // Clear first so screen readers re-announce when the same message repeats.
        if (pendingPoliteSetRef.current !== null) {
          clearTimeout(pendingPoliteSetRef.current)
        }
        setPoliteAnnouncement('')
        pendingPoliteSetRef.current = setTimeout(() => {
          pendingPoliteSetRef.current = null
          setPoliteAnnouncement(message)
        }, 0)
      }, MOVEMENT_ANNOUNCEMENT_DELAY_MS)
    },
    [clearQueuedMovementAnnouncement],
  )

  const announceAssertive = useCallback(
    (message: string) => {
      clearQueuedMovementAnnouncement()
      // Clear first so screen readers re-announce when the same message repeats.
      if (pendingAssertiveSetRef.current !== null) {
        clearTimeout(pendingAssertiveSetRef.current)
      }
      setAssertiveAnnouncement('')
      pendingAssertiveSetRef.current = setTimeout(() => {
        pendingAssertiveSetRef.current = null
        setAssertiveAnnouncement(message)
      }, 0)
    },
    [clearQueuedMovementAnnouncement],
  )

  const clearAssertiveAnnouncement = useCallback(() => {
    clearQueuedMovementAnnouncement()
    if (pendingAssertiveSetRef.current !== null) {
      clearTimeout(pendingAssertiveSetRef.current)
      pendingAssertiveSetRef.current = null
    }
    setAssertiveAnnouncement('')
  }, [clearQueuedMovementAnnouncement])

  return {
    politeAnnouncement,
    assertiveAnnouncement,
    announcePolite,
    announceAssertive,
    clearAssertiveAnnouncement,
    queueMovementAnnouncement,
    clearQueuedMovementAnnouncement,
  }
}
