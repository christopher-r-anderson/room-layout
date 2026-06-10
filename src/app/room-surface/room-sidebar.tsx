import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { IconX } from '@tabler/icons-react'
import type { Ref } from 'react'
import type { RoomControlsProps } from './room-controls'
import { RoomSurfaceContent } from './room-surface-content'

export function RoomSidebar({
  containerRef,
  open,
  onClose,
  ...controls
}: RoomControlsProps & {
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
      className="pointer-events-auto fixed inset-y-2 right-2 z-20 hidden md:block"
      style={{ width: '22rem' }}
      onKeyDown={(event) => {
        if (event.key !== 'Escape') {
          return
        }

        event.preventDefault()
        onClose()
      }}
    >
      <Card className="flex h-full flex-col border-border/70 bg-background/90 shadow-lg backdrop-blur-sm">
        <RoomSurfaceContent {...controls}>
          {({ controls: roomControls, description }) => (
            <>
              <CardHeader className="flex flex-row items-start justify-between gap-3 space-y-0">
                <div className="space-y-1">
                  <CardTitle id="room-surface-title">Room</CardTitle>
                  <CardDescription>{description}</CardDescription>
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
                <ScrollArea className="min-h-0 flex-1 pr-3">
                  {roomControls}
                </ScrollArea>
              </CardContent>
            </>
          )}
        </RoomSurfaceContent>
      </Card>
    </aside>
  )
}
