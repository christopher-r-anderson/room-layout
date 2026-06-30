import type { ComponentProps } from 'react'
import type { VariantProps } from 'class-variance-authority'
import { cn } from '@/shared/lib/utils'
import { surfaceVariants } from './surface-variants'

/**
 * Frosted, elevated chrome that floats over the 3D scene — the bare overlay
 * surface primitive (toolbars). Structured panels get the same skin through
 * `Card`'s overlay variant. Purely presentational: callers set role/aria (e.g. a
 * Toolbar.Root via `render`) and their own layout.
 */
export function Surface({
  className,
  padding,
  ref,
  ...props
}: ComponentProps<'div'> & VariantProps<typeof surfaceVariants>) {
  return (
    <div
      ref={ref}
      className={cn(surfaceVariants({ padding }), className)}
      {...props}
    />
  )
}
