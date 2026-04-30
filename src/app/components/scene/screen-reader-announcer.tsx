export function ScreenReaderAnnouncer({
  politeMessage,
  assertiveMessage,
}: {
  politeMessage: string
  assertiveMessage: string
}) {
  return (
    <div className="sr-only">
      <div aria-live="polite" aria-atomic="true">
        {politeMessage}
      </div>
      <div aria-live="assertive" aria-atomic="true">
        {assertiveMessage}
      </div>
    </div>
  )
}
