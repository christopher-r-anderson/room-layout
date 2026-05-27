import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { IconCheck, IconShare3 } from '@tabler/icons-react'

interface ShareSceneButtonProps {
  disabled?: boolean
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
}

export function ShareSceneButton({
  disabled = false,
  onShareSceneUrl,
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
      variant="default"
      size="default"
      disabled={disabled || isPending}
      onClick={() => {
        void handleClick()
      }}
      aria-label="Share room layout"
      className="pointer-events-auto"
    >
      {shareResult === null ? (
        <IconShare3 aria-hidden="true" size={16} />
      ) : (
        <IconCheck aria-hidden="true" size={16} />
      )}
      <span className="hidden sm:inline">{label}</span>
    </Button>
  )
}
