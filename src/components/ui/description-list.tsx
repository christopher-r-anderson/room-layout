import { cn } from '@/lib/utils'
import type { ComponentProps } from 'react'

export function DescriptionList({ className, ...props }: ComponentProps<'dl'>) {
  return (
    <dl
      className={cn(
        'm-0 grid grid-cols-[minmax(5.75rem,7.5rem)_minmax(0,1fr)] gap-x-3 gap-y-2 max-[560px]:grid-cols-1 max-[560px]:gap-y-1',
        className,
      )}
      {...props}
    />
  )
}

export function DescriptionTerm({ className, ...props }: ComponentProps<'dt'>) {
  return (
    <dt
      className={cn(
        'm-0 text-xs font-bold leading-snug text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}

export function DescriptionDetail({
  className,
  ...props
}: ComponentProps<'dd'>) {
  return (
    <dd
      className={cn(
        'm-0 min-w-0 text-sm leading-relaxed text-foreground max-[560px]:mb-2',
        className,
      )}
      {...props}
    />
  )
}
