import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'
import { IconHomeCog } from '@tabler/icons-react'
import type { ComponentProps } from 'react'

export function EnvironmentButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <div className={cn('flex items-center', className)}>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              type="button"
              variant="secondary"
              size="default"
              aria-controls="environment-dialog"
              aria-haspopup="dialog"
              className="pointer-events-auto"
              {...props}
            >
              <IconHomeCog size={16} aria-hidden="true" />
              Environment
            </Button>
          }
        />
        <TooltipContent side="bottom">Room finishes</TooltipContent>
      </Tooltip>
    </div>
  )
}
