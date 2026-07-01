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
} from '@/shared/ui/dialog'
import { ScrollArea } from '@/shared/ui/scroll-area'
import { Trans } from '@lingui/react/macro'

// Proper name and repository URL: identity data, not translatable copy.
const AUTHOR_NAME = 'Christopher Anderson'
const REPOSITORY_LABEL = 'github.com/christopher-r-anderson/room-layout'

export function ProjectInfoDialog({
  onOpenChange,
  open,
}: {
  onOpenChange: (open: boolean) => void
  open: boolean
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent id="project-info-dialog">
        <DialogHeader>
          <DialogTitle>
            <Trans>Project &amp; Asset Info</Trans>
          </DialogTitle>
          <DialogDescription>
            <Trans>
              Room Layout: an open source 3D furniture layout tool. All 3D
              assets are CC-licensed and attributed below.
            </Trans>
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
                <Trans>Repository</Trans>
              </h3>
              <DescriptionList>
                <DescriptionTerm>
                  <Trans>Author</Trans>
                </DescriptionTerm>
                <DescriptionDetail>
                  <a
                    className="underline underline-offset-3"
                    href="https://christopheranderson.net"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {AUTHOR_NAME} <span aria-hidden>↗</span>
                  </a>
                </DescriptionDetail>
                <DescriptionTerm>
                  <Trans>Source code</Trans>
                </DescriptionTerm>
                <DescriptionDetail>
                  <a
                    className="underline underline-offset-3"
                    href="https://github.com/christopher-r-anderson/room-layout"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {REPOSITORY_LABEL} <span aria-hidden>↗</span>
                  </a>
                </DescriptionDetail>
                <DescriptionTerm>
                  <Trans>License</Trans>
                </DescriptionTerm>
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
