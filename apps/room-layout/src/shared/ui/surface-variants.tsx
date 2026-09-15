import { cva } from 'class-variance-authority'

/**
 * The frosted overlay skin: translucent, blurred chrome that floats over the 3D
 * scene. Shared by `Surface` (bare chrome - toolbars) and `Card`'s overlay
 * variant (structured panels) so the two never drift apart.
 */
export const overlaySurfaceClass =
  'rounded-xl border border-border/70 bg-background/92 shadow-sm backdrop-blur-sm'

export const surfaceVariants = cva(overlaySurfaceClass, {
  variants: {
    padding: {
      snug: 'p-1.5',
      comfortable: 'p-2',
    },
  },
  defaultVariants: {
    padding: 'comfortable',
  },
})
