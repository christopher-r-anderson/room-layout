import { InteractiveFurniture } from './interactive-furniture'
import type { InteractiveFurnitureProps } from './furniture.types'

export function Armchair(props: InteractiveFurnitureProps) {
  return <InteractiveFurniture {...props} nodeName="armchair" />
}
