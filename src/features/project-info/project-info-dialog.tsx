import { AssetAttributionList } from './asset-attribution'
import {
  DescriptionDetail,
  DescriptionList,
  DescriptionTerm,
} from '@/shared/ui/description-list'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/shared/ui/dialog'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import type { ReactElement } from 'react'

export function ProjectInfoDialog({
  onOpenChange,
  open,
  triggerButton,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
  triggerButton?: ReactElement | null
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {triggerButton ? (
        <Tooltip>
          <TooltipTrigger render={<DialogTrigger render={triggerButton} />} />
          <TooltipContent side="bottom">Project and asset info</TooltipContent>
        </Tooltip>
      ) : null}
      <DialogContent id="project-info-dialog">
        <DialogHeader>
          <DialogTitle>Project &amp; Asset Info</DialogTitle>
          <DialogDescription>
            Room Layout: an open source 3D furniture layout tool. All 3D assets
            are CC-licensed and attributed below.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[75vh]">
          <div className="grid gap-4 pb-2">
            <section
              className="grid gap-2 rounded-lg border p-3"
              aria-labelledby="project-links-heading"
            >
              <h3
                id="project-links-heading"
                className="text-sm font-semibold text-foreground"
              >
                Repository
              </h3>
              <DescriptionList>
                <DescriptionTerm>Author</DescriptionTerm>
                <DescriptionDetail>
                  <a
                    className="underline underline-offset-3"
                    href="https://christopheranderson.net"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Christopher Anderson <span aria-hidden>↗</span>
                  </a>
                </DescriptionDetail>
                <DescriptionTerm>Source code</DescriptionTerm>
                <DescriptionDetail>
                  <a
                    className="underline underline-offset-3"
                    href="https://github.com/christopher-r-anderson/room-layout"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    github.com/christopher-r-anderson/room-layout{' '}
                    <span aria-hidden>↗</span>
                  </a>
                </DescriptionDetail>
                <DescriptionTerm>License</DescriptionTerm>
                <DescriptionDetail>
                  <a
                    className="underline underline-offset-3"
                    href="https://opensource.org/licenses/MIT"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    MIT <span aria-hidden>↗</span>
                  </a>
                </DescriptionDetail>
              </DescriptionList>
            </section>

            <AssetAttributionList />
          </div>
        </ScrollArea>
        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  )
}
