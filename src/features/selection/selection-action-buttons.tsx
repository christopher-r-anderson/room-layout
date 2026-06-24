import type { ComponentProps } from 'react'
import { ToolButton } from '@/shared/ui/tool-button'
import { IconRotate3d, IconTrash } from '@tabler/icons-react'

type ToolButtonProps = Partial<ComponentProps<typeof ToolButton>>

export function RotateCounterclockwiseButton({ ...props }: ToolButtonProps) {
  return (
    <ToolButton
      shortcuts=","
      label="Rotate counterclockwise"
      icon={<IconRotate3d className="-scale-x-100" />}
      {...props}
    />
  )
}

export function RotateClockwiseButton({ ...props }: ToolButtonProps) {
  return (
    <ToolButton
      shortcuts="."
      label="Rotate clockwise"
      icon={<IconRotate3d />}
      {...props}
    />
  )
}

export function DeleteButton({ ...props }: ToolButtonProps) {
  return (
    <ToolButton
      shortcuts="Delete Backspace"
      label="Remove item"
      icon={<IconTrash />}
      {...props}
    />
  )
}
