import type { ReactNode } from 'react'
import { RoomControls, type RoomControlsProps } from './room-controls'
import { ROOM_SURFACE_DESCRIPTION } from './room-copy'

interface RoomSurfaceContentProps extends RoomControlsProps {
  children: (content: { controls: ReactNode; description: string }) => ReactNode
}

export function RoomSurfaceContent({
  children,
  ...controls
}: RoomSurfaceContentProps) {
  return children({
    controls: <RoomControls {...controls} />,
    description: ROOM_SURFACE_DESCRIPTION,
  })
}
