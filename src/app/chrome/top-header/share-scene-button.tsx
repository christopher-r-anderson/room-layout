import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { IconCheck, IconShare3 } from '@tabler/icons-react'
import type { ComponentProps } from 'react'

interface ShareSceneButtonProps {
  disabled?: boolean
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
  className?: string
  size?: ComponentProps<typeof Button>['size']
  variant?: ComponentProps<typeof Button>['variant']
}

export function ShareSceneButton({
  disabled = false,
  onShareSceneUrl,
  className,
  size = 'default',
  variant = 'default',
}: ShareSceneButtonProps) {
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
      const result = await onShareSceneUrl()

      if (result !== null) {
        setShareResult(result)
      }
    } catch {
      // The handler owns user-facing error reporting; always recover button state.
    } finally {
      setIsPending(false)
    }
  }, [isPending, onShareSceneUrl])

  const label =
    shareResult === 'shared'
      ? 'Shared'
      : shareResult === 'copied'
        ? 'Copied'
        : 'Share'

  return (
    <Button
      variant={variant}
      size={size}
      disabled={disabled || isPending}
      onClick={() => {
        void handleClick()
      }}
      aria-label="Share room layout"
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
