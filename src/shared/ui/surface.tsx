import { cva, type VariantProps } from 'class-variance-authority'
import type { ComponentProps } from 'react'
import { cn } from '@/shared/lib/utils'

const surfaceVariants = cva(
  'rounded-xl border border-border/70 bg-background/92 shadow-sm backdrop-blur-sm',
  {
    variants: {
      padding: {
        snug: 'p-1.5',
        comfortable: 'p-2',
      },
    },
    defaultVariants: {
      padding: 'comfortable',
    },
  },
)

/**
 * Frosted, elevated chrome that floats over the 3D scene. The single overlay
 * surface primitive: toolbars and overlay panels all separate from the moving
 * background with the same translucency, blur, border, and elevation. Purely
 * presentational — callers set role/aria (e.g. a Toolbar.Root via `render`) and
 * their own layout.
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
