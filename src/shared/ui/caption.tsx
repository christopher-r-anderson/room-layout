import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

/**
 * Small muted label that titles a control cluster or panel section.
 */
export function Caption({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground',
        className,
      )}
      {...props}
    />
  )
}
