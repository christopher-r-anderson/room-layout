import {
  useAssertiveAnnouncement,
  usePoliteAnnouncement,
} from '@/core/stores/feedback-store'

export function Announcer() {
  const politeMessage = usePoliteAnnouncement()
  const assertiveMessage = useAssertiveAnnouncement()

  return (
    <div className="sr-only" data-announcer-root>
      <div
        aria-live="polite"
        aria-atomic="true"
        data-announcer-channel="polite"
      >
        {politeMessage}
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        data-announcer-channel="assertive"
      >
        {assertiveMessage}
      </div>
    </div>
  )
}
