import { create } from 'zustand'

const MOVEMENT_ANNOUNCEMENT_DELAY_MS = 180

// A live-region message plus a monotonic nonce. The Announcer keys a fresh
// DOM node off the nonce, so repeating the same text is still a new "addition"
// for screen readers and re-announces without the old clear-then-set timer
// dance.
export interface Announcement {
  text: string
  nonce: number
}

interface AnnouncementStoreState {
  polite: Announcement
  assertive: Announcement
}

// The debounce timer lives at module scope rather than in store state: it is
// an imperative scheduling detail, not a reactive value, and there is a single
// announcement region for the app.
let movementAnnouncementTimeout: number | null = null
let nonceCounter = 0

export function clearQueuedMovementAnnouncement() {
  if (movementAnnouncementTimeout !== null) {
    window.clearTimeout(movementAnnouncementTimeout)
    movementAnnouncementTimeout = null
  }
}

// Module-private: mutation goes through the feedback API and reads through the
// narrow hooks below.
const useAnnouncementStore = create<AnnouncementStoreState>()(() => ({
  polite: { text: '', nonce: 0 },
  assertive: { text: '', nonce: 0 },
}))

function announce(channel: 'polite' | 'assertive', text: string) {
  nonceCounter += 1
  useAnnouncementStore.setState({ [channel]: { text, nonce: nonceCounter } })
}

export function announcePolite(text: string) {
  if (!text) {
    return
  }

  clearQueuedMovementAnnouncement()
  announce('polite', text)
}

export function announceAssertive(text: string) {
  if (!text) {
    return
  }

  clearQueuedMovementAnnouncement()
  announce('assertive', text)
}

// Debounced polite channel for continuous interactions (keyboard move/rotate):
// only the latest message inside the window announces, so rapid keypresses do
// not queue a backlog of stale positions.
export function queueMovementAnnouncement(text: string) {
  if (!text) {
    return
  }

  clearQueuedMovementAnnouncement()

  movementAnnouncementTimeout = window.setTimeout(() => {
    movementAnnouncementTimeout = null
    announce('polite', text)
  }, MOVEMENT_ANNOUNCEMENT_DELAY_MS)
}

// Clears the pending debounce timer along with both channels.
export function resetAnnouncements() {
  clearQueuedMovementAnnouncement()
  useAnnouncementStore.setState(useAnnouncementStore.getInitialState(), true)
}

export const announcementStoreForTests = {
  getState: () => useAnnouncementStore.getState(),
}

export const usePoliteAnnouncement = () =>
  useAnnouncementStore((state) => state.polite)
export const useAssertiveAnnouncement = () =>
  useAnnouncementStore((state) => state.assertive)
