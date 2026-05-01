import { useCallback, useRef, useState } from 'react'

const MOVEMENT_ANNOUNCEMENT_DELAY_MS = 180

interface EditorAnnouncements {
  politeAnnouncement: string
  assertiveAnnouncement: string
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  clearAssertiveAnnouncement: () => void
  queueMovementAnnouncement: (message: string) => void
  clearQueuedMovementAnnouncement: () => void
}

export function useEditorAnnouncements(): EditorAnnouncements {
  const [politeAnnouncement, setPoliteAnnouncement] = useState('')
  const [assertiveAnnouncement, setAssertiveAnnouncement] = useState('')
  const movementAnnouncementTimeoutRef = useRef<number | null>(null)

  const clearQueuedMovementAnnouncement = useCallback(() => {
    if (movementAnnouncementTimeoutRef.current === null) {
      return
    }

    window.clearTimeout(movementAnnouncementTimeoutRef.current)
    movementAnnouncementTimeoutRef.current = null
  }, [])

  const announcePolite = useCallback(
    (message: string) => {
      if (!message) {
        return
      }

      clearQueuedMovementAnnouncement()
      setPoliteAnnouncement(message)
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
        setPoliteAnnouncement(message)
        movementAnnouncementTimeoutRef.current = null
      }, MOVEMENT_ANNOUNCEMENT_DELAY_MS)
    },
    [clearQueuedMovementAnnouncement],
  )

  const announceAssertive = useCallback(
    (message: string) => {
      clearQueuedMovementAnnouncement()
      setAssertiveAnnouncement(message)
    },
    [clearQueuedMovementAnnouncement],
  )

  const clearAssertiveAnnouncement = useCallback(() => {
    clearQueuedMovementAnnouncement()
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
