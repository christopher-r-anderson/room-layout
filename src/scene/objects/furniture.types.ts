import type { Object3D, Vector3Tuple } from 'three'
import type { ThreeEvent } from '@react-three/fiber'

export type FurnitureKind = 'armchair' | 'couch'

export interface FurnitureItem {
  id: string
  kind: FurnitureKind
  collectionId: string
  nodeName: string
  sourcePath: string
  position: Vector3Tuple
}

export interface DraggableFurnitureProps {
  id: string
  position: Vector3Tuple
  sourceScene: Object3D
  selected: boolean
  onObjectReady: (id: string, object: Object3D | null) => void
  onSelect: (id: string) => void
  onDragStart: (id: string, event: ThreeEvent<PointerEvent>) => void
  onDrag: (id: string, event: ThreeEvent<PointerEvent>) => void
  onDragEnd: (id: string, event: ThreeEvent<PointerEvent>) => void
}
