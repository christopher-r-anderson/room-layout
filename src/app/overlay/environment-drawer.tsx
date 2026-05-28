import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  EnvironmentControls,
  type EnvironmentControlsProps,
} from './environment-panel'

export function EnvironmentDrawer({
  open,
  onOpenChange,
  onCloseAutoFocus,
  ...controls
}: EnvironmentControlsProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCloseAutoFocus?: () => void
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)

        if (!nextOpen) {
          queueMicrotask(() => {
            onCloseAutoFocus?.()
          })
        }
      }}
    >
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Environment</DrawerTitle>
          <DrawerDescription>
            Choose the wall and floor finishes for the room.
          </DrawerDescription>
        </DrawerHeader>
        <ScrollArea className="max-h-[min(70vh,calc(100dvh-10rem))] px-4 pb-4">
          <EnvironmentControls {...controls} />
        </ScrollArea>
      </DrawerContent>
    </Drawer>
  )
}
