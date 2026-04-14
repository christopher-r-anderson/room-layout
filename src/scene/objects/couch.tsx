import { DraggableFurniture } from './draggable-furniture'
import type { DraggableFurnitureProps } from './furniture.types'

export function Couch(props: DraggableFurnitureProps) {
  return <DraggableFurniture {...props} nodeName="couch" />
}
