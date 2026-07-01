import { useLingui } from '@lingui/react/macro'
import { useStatusMessage } from '@/core/stores/feedback-store'

export function StatusMessage({ message }: { message?: string | null }) {
  const { t } = useLingui()
  const storeMessage = useStatusMessage()
  const resolvedMessage = message === undefined ? storeMessage : message

  return (
    <p
      role="status"
      aria-label={t`Editor status`}
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
