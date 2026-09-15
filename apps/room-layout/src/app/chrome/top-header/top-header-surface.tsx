import { cn } from '@/shared/lib/utils'
import type { ComponentProps } from 'react'
import { Surface } from '@/shared/ui/surface'

/**
 * The header's content row: a comfortable overlay Surface that lays its children
 * out as a wrapping control row. Purely presentational - callers set role/aria
 * where the semantics belong (e.g. as a Toolbar.Root via `render`).
 */
export function TopHeaderSurface({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <Surface
      padding="comfortable"
      className={cn('flex flex-wrap items-center gap-2', className)}
      {...props}
    />
  )
}
