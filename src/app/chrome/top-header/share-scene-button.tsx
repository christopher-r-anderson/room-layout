import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useLingui } from '@lingui/react/macro'
import { IconCheck, IconShare3 } from '@tabler/icons-react'
import type { ComponentProps } from 'react'
import { shareScene } from '@/core/operations/share-scene'

interface ShareSceneButtonProps {
  disabled?: boolean
  className?: string
  size?: ComponentProps<typeof Button>['size']
  variant?: ComponentProps<typeof Button>['variant']
}

export function ShareSceneButton({
  disabled = false,
  className,
  size = 'default',
  variant = 'default',
}: ShareSceneButtonProps) {
  const { t } = useLingui()
  const [shareResult, setShareResult] = useState<'shared' | 'copied' | null>(
    null,
  )
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (shareResult === null) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setShareResult(null)
    }, 1500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [shareResult])

  const handleClick = useCallback(async () => {
    if (isPending) {
      return
    }

    setIsPending(true)

    try {
      const result = await shareScene()

      if (result !== null) {
        setShareResult(result)
      }
    } catch {
      // shareScene owns user-facing error reporting; always recover button state.
    } finally {
      setIsPending(false)
    }
  }, [isPending])

  const label =
    shareResult === 'shared'
      ? t`Shared`
      : shareResult === 'copied'
        ? t`Copied`
        : t`Share`

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isPending}
      onClick={() => {
        void handleClick()
      }}
      aria-label={t`Share room layout`}
      className={className}
    >
      {shareResult === null ? (
        <IconShare3 aria-hidden="true" size={16} />
      ) : (
        <IconCheck aria-hidden="true" size={16} />
      )}
      <span>{label}</span>
    </Button>
  )
}
