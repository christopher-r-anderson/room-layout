import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useLingui } from '@lingui/react/macro'
import { IconCheck, IconShare3 } from '@tabler/icons-react'
import type { ComponentProps } from 'react'
import { shareScene } from '@/core/operations/share-scene'

// Accepts the full Button surface (including the ref, roving tabindex, and data
// attributes a Toolbar.Button injects through its `render` prop) and forwards it
// to the underlying button. Forwarding is what registers this control as a real
// toolbar item; without it the button stays a stray tab stop outside the header
// toolbar's arrow navigation.
type ShareSceneButtonProps = ComponentProps<typeof Button>

export function ShareSceneButton({
  size = 'default',
  variant = 'default',
  disabled = false,
  className,
  onClick,
  ...props
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

  const runShare = useCallback(async () => {
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

  const handleClick = useCallback<
    NonNullable<ShareSceneButtonProps['onClick']>
  >(
    (event) => {
      // Run any handler the toolbar injected (roving-focus bookkeeping) before
      // starting the share.
      onClick?.(event)
      void runShare()
    },
    [onClick, runShare],
  )

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
      aria-label={t`Share room layout`}
      className={className}
      onClick={handleClick}
      {...props}
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
