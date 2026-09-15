import { ScrollArea } from '@/shared/ui/scroll-area'
import type { Ref } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer'
import { RoomControls } from './room-controls'
import { Trans } from '@lingui/react/macro'

export function RoomDrawer({
  ref,
  open,
  onOpenChange,
  onCloseAutoFocus,
  restoreFocusOnClose = true,
}: {
  ref?: Ref<HTMLDivElement>
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus?: () => void
  restoreFocusOnClose?: boolean
}) {
  return (
    <Drawer
      modal={false}
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
      }}
    >
      <DrawerContent
        ref={ref}
        id="room-drawer"
        showOverlay={false}
        className="h-[50dvh] min-h-[50dvh] max-h-[50dvh] overflow-hidden"
        onCloseAutoFocus={(event) => {
          event.preventDefault()

          if (restoreFocusOnClose) {
            onCloseAutoFocus?.()
          }
        }}
      >
        <DrawerHeader>
          <DrawerTitle>
            <Trans>Room</Trans>
          </DrawerTitle>
          <DrawerDescription>
            <Trans>
              Adjust wall finishes, flooring, and lighting to match your room.
            </Trans>
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          <RoomControls />
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
