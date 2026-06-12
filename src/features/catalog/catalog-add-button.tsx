import { Button } from '@/shared/ui/button'
import { cn } from '@/shared/lib/utils'
import { IconPlus } from '@tabler/icons-react'
import type { ComponentProps } from 'react'

export function CatalogAddButton({
  className,
  size = 'toolbar',
  variant = 'default',
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn('pointer-events-auto', className)}
      {...props}
    >
      <IconPlus aria-hidden="true" size={16} />
      <span>Add Furniture</span>
    </Button>
  )
}
