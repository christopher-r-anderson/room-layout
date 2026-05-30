import { ScrollArea } from '@/components/ui/scroll-area'
import type { Ref } from 'react'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { RoomControls, type RoomControlsProps } from './room-controls'
import { ROOM_SURFACE_DESCRIPTION } from './room-copy'

export function RoomDrawer({
  contentRef,
  open,
  onOpenChange,
  onCloseAutoFocus,
  restoreFocusOnClose = true,
  ...controls
}: RoomControlsProps & {
  contentRef?: Ref<HTMLDivElement>
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
        ref={contentRef}
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
          <DrawerTitle>Room</DrawerTitle>
          <DrawerDescription>{ROOM_SURFACE_DESCRIPTION}</DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="min-h-0 flex-1 px-4 pb-4">
          <RoomControls {...controls} />
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
