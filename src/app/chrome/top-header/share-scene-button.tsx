import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/shared/ui/button'
import { useLingui } from '@lingui/react/macro'
import { IconCheck, IconShare3 } from '@tabler/icons-react'
import type { ComponentProps } from 'react'
import { shareScene } from '@/core/operations/share-scene'

export function ShareSceneButton({
  size = 'default',
  variant = 'default',
  disabled = false,
  onClick,
  ...props
}: Omit<ComponentProps<typeof Button>, 'children' | 'aria-label'>) {
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
      // shareScene reports its own errors; always recover the button state.
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
      {...props}
      variant={variant}
      size={size}
      disabled={disabled || isPending}
      focusableWhenDisabled
      aria-label={t`Share room layout`}
      onClick={(event) => {
        // Run a parent-injected click handler first and let it veto the share:
        // a disabled wrapper cancels the click via preventDefault.
        onClick?.(event)
        if (event.defaultPrevented) {
          return
        }
        void runShare()
      }}
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
