import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { IconInfoCircle } from '@tabler/icons-react'
import type { ComponentProps } from 'react'

export function ProjectInfoButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <div className={cn('flex items-center', className)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="secondary"
              size="icon"
              aria-controls="project-info-dialog"
              aria-haspopup="dialog"
              aria-label="Open project and asset info"
              className="rounded-md"
              {...props}
            >
              <IconInfoCircle size={20} aria-hidden="true" />
            </Button>
          }
        />
        <TooltipContent side="bottom">Project and asset info</TooltipContent>
      </Tooltip>
    </div>
  )
}
