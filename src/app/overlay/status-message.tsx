export function StatusMessage({ message }: { message: string | null }) {
  if (!message) {
    return null
  }
  return (
    <p className="bg-secondary text-destructive p-2 rounded border border-destructive">
      {message}
    </p>
  )
}
