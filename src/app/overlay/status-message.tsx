export function StatusMessage({ message }: { message: string | null }) {
  return (
    <p
      role="status"
      className={
        message
          ? 'bg-secondary text-destructive p-2 rounded border border-destructive'
          : undefined
      }
    >
      {message}
    </p>
  )
}
