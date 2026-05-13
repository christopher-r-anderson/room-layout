import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IconInfoCircle } from '@tabler/icons-react'
import type { ComponentProps } from 'react'

export function ProjectInfoButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <div className={cn('flex items-center', className)}>
      <Button
        variant="secondary"
        size="icon"
        aria-controls="project-info-dialog"
        aria-haspopup="dialog"
        aria-label="Open project and asset info"
        className="rounded-md"
        {...props}
      >
        <IconInfoCircle size={20} />
      </Button>
    </div>
  )
}
