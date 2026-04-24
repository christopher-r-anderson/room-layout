import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { IconPlus } from '@tabler/icons-react'
import type { ComponentProps } from 'react'

export function CatalogAddButton({
  className,
  ...props
}: ComponentProps<typeof Button>) {
  return (
    <Button
      className={cn(
        'group relative flex h-12 w-12 items-center justify-center overflow-hidden rounded-full transition-all duration-300 ease-in-out hover:w-42 focus-visible:w-42',
        className,
      )}
      {...props}
    >
      <span className="whitespace-nowrap mx-4 opacity-0 transition-all duration-300 group-hover:opacity-100 group-focus:opacity-100">
        Add Furniture
      </span>
      <div className="flex absolute right-4">
        <IconPlus />
      </div>
    </Button>
  )
}
