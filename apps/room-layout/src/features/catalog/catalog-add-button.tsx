import { Button } from '@/shared/ui/button'
import { IconPlus } from '@tabler/icons-react'
import type { ComponentProps } from 'react'
import { Trans } from '@lingui/react/macro'

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
      className={className}
      {...props}
    >
      <IconPlus aria-hidden="true" size={16} />
      <span>
        <Trans>Add Furniture</Trans>
      </span>
    </Button>
  )
}
