import {
  useAssertiveAnnouncement,
  usePoliteAnnouncement,
} from '@/core/stores/feedback-store'

// Each message renders as a fresh node keyed by its nonce, so repeating the
// same text is still an "additions" mutation and screen readers re-announce
// it. The regions themselves stay mounted for the app's lifetime — live
// regions only announce reliably when they exist before their first message.
export function Announcer() {
  const polite = usePoliteAnnouncement()
  const assertive = useAssertiveAnnouncement()

  return (
    <div className="sr-only" data-announcer-root>
      <div
        aria-live="polite"
        aria-atomic="true"
        data-announcer-channel="polite"
      >
        <span key={polite.nonce}>{polite.text}</span>
      </div>
      <div
        aria-live="assertive"
        aria-atomic="true"
        data-announcer-channel="assertive"
      >
        <span key={assertive.nonce}>{assertive.text}</span>
      </div>
    </div>
  )
}
