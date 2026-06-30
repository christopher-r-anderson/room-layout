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
import { ROOM_SURFACE_DESCRIPTION } from './room-copy'

export function RoomSidebar({
  containerRef,
  open,
  onClose,
}: {
  containerRef?: Ref<HTMLElement>
  open: boolean
  onClose: () => void
}) {
  if (!open) {
    return null
  }

  return (
    <aside
      ref={containerRef}
      id="room-surface"
      aria-labelledby="room-surface-title"
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
            <CardTitle id="room-surface-title">Room</CardTitle>
            <CardDescription>{ROOM_SURFACE_DESCRIPTION}</CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            aria-label="Close room panel"
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
