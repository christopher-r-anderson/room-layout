import type { ReactElement } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  EnvironmentControls,
  type EnvironmentControlsProps,
} from './environment-panel'

export function EnvironmentDialog({
  open,
  onOpenChange,
  triggerButton,
  ...controls
}: EnvironmentControlsProps & {
  open: boolean
  onOpenChange: (open: boolean) => void
  triggerButton: ReactElement
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger render={triggerButton} />
      <DialogContent id="environment-dialog" className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Environment</DialogTitle>
          <DialogDescription>
            Choose the wall and floor finishes for the room.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[min(70vh,calc(100dvh-10rem))]">
          <div className="pb-2 pr-3">
            <EnvironmentControls {...controls} />
          </div>
        </ScrollArea>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
