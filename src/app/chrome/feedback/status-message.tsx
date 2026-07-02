import type { Ref } from 'react'
import { useLingui } from '@lingui/react/macro'
import { cn } from '@/shared/lib/utils'
import { useStatusMessage } from '@/core/stores/feedback-store'

export function StatusMessage({
  message,
  ref,
  className,
}: {
  message?: string | null
  ref?: Ref<HTMLParagraphElement>
  className?: string
}) {
  const { t } = useLingui()
  const storeMessage = useStatusMessage()
  const resolvedMessage = message === undefined ? storeMessage : message

  return (
    <p
      ref={ref}
      role="status"
      aria-label={t`Editor status`}
      className={cn(
        className,
        resolvedMessage &&
          'bg-secondary text-destructive p-2 rounded border border-destructive',
      )}
    >
      {resolvedMessage}
    </p>
  )
}
