import { InteractiveFurniture } from './interactive-furniture'
import type { InteractiveFurnitureProps } from './furniture.types'

export function Couch(props: InteractiveFurnitureProps) {
  return <InteractiveFurniture {...props} nodeName="couch" />
}
