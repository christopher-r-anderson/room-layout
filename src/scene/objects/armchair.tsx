import { DraggableFurniture } from './draggable-furniture'
import type { DraggableFurnitureProps } from './furniture.types'

export function Armchair(props: DraggableFurnitureProps) {
  return <DraggableFurniture {...props} nodeName="armchair" />
}
