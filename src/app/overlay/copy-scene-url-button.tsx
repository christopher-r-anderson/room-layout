import { useCallback, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { IconCheck, IconLink } from '@tabler/icons-react'

interface CopySceneUrlButtonProps {
  disabled?: boolean
  onCopySceneUrl: () => Promise<boolean>
}

export function CopySceneUrlButton({
  disabled = false,
  onCopySceneUrl,
}: CopySceneUrlButtonProps) {
  const [copySuccessVisible, setCopySuccessVisible] = useState(false)

  useEffect(() => {
    if (!copySuccessVisible) {
      return
    }

    const timeoutId = window.setTimeout(() => {
      setCopySuccessVisible(false)
    }, 1500)

    return () => {
      window.clearTimeout(timeoutId)
    }
  }, [copySuccessVisible])

  const handleClick = useCallback(async () => {
    const copied = await onCopySceneUrl()

    if (copied) {
      setCopySuccessVisible(true)
    }
  }, [onCopySceneUrl])

  return (
    <Button
      variant="secondary"
      size="sm"
      disabled={disabled}
      onClick={() => {
        void handleClick()
      }}
      aria-label="Copy Scene URL to clipboard"
      className="pointer-events-auto"
    >
      {copySuccessVisible ? (
        <IconCheck aria-hidden="true" size={16} />
      ) : (
        <IconLink aria-hidden="true" size={16} />
      )}
      {copySuccessVisible ? 'Copied' : 'Copy Scene URL'}
    </Button>
  )
}
