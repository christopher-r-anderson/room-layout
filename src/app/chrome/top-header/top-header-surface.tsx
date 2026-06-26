import { cn } from '@/shared/lib/utils'
import type { ComponentProps } from 'react'

/**
 * Frosted, elevated surface that sits over the 3D scene and separates its
 * contents from the background, laying its children out as a wrapping control
 * row. Purely presentational: it carries no role, so callers set role/aria
 * where the semantics belong (e.g. as a Toolbar.Root via `render`).
 */
export function TopHeaderSurface({
  className,
  ...props
}: ComponentProps<'div'>) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/75 p-2 backdrop-blur-[2px]',
        className,
      )}
      {...props}
    />
  )
}
