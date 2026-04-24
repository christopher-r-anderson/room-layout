export function StatusMessage({ message }: { message: string | null }) {
  if (!message) {
    return null
  }
  return (
    <p className="text-xs/relaxed text-destructive" role="status">
      {message}
    </p>
  )
}
