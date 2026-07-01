import { Button } from '@/shared/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/shared/ui/card'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { IconX } from '@tabler/icons-react'
import type { Ref } from 'react'
import { RoomControls } from './room-controls'
import { Trans, useLingui } from '@lingui/react/macro'

export function RoomSidebar({
  containerRef,
  open,
  onClose,
}: {
  containerRef?: Ref<HTMLElement>
  open: boolean
  onClose: () => void
}) {
  const { t } = useLingui()

  if (!open) {
    return null
  }

  return (
    <aside
      ref={containerRef}
      id="room-surface"
      aria-labelledby="room-surface-title"
      // Pinned to the physical right edge: the camera tools clear this panel on the
      // same side for right-thumb reach, so it uses physical `right`, not a logical inset.
      className="pointer-events-auto fixed w-room-panel inset-y-2 right-2 z-20 hidden md:block"
      onKeyDown={(event) => {
        if (event.key !== 'Escape') {
          return
        }

        event.preventDefault()
        onClose()
      }}
    >
      <Card variant="overlay" className="flex h-full flex-col">
        <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
          <div className="space-y-1">
            <CardTitle id="room-surface-title">
              <Trans>Room</Trans>
            </CardTitle>
            <CardDescription>
              <Trans>
                Adjust wall finishes, flooring, and lighting to match your room.
              </Trans>
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label={t`Close room panel`}
            onClick={onClose}
          >
            <IconX aria-hidden="true" />
          </Button>
        </CardHeader>
        <CardContent className="flex min-h-0 flex-1 flex-col pt-0">
          <ScrollArea className="min-h-0 flex-1">
            <RoomControls />
          </ScrollArea>
        </CardContent>
      </Card>
    </aside>
  )
}
