export function Announcer({
  politeMessage,
  assertiveMessage,
}: {
  politeMessage: string
  assertiveMessage: string
}) {
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
