import { useEditorMessage } from '@/editor-state/scene-state-store'

export function StatusMessage({ message }: { message?: string | null }) {
  const storeMessage = useEditorMessage()
  const resolvedMessage = message === undefined ? storeMessage : message

  return (
    <p
      role="status"
      aria-label="Editor status"
      className={
        resolvedMessage
          ? 'bg-secondary text-destructive p-2 rounded border border-destructive'
          : undefined
      }
    >
      {resolvedMessage}
    </p>
  )
}
