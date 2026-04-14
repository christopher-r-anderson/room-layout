import type { Object3D, Vector3Tuple } from 'three'
import type { ThreeEvent } from '@react-three/fiber'

export type FurnitureKind = 'armchair' | 'couch'

export interface FootprintSize {
  width: number
  depth: number
}

export interface FurnitureItem {
  id: string
  kind: FurnitureKind
  collectionId: string
  nodeName: string
  sourcePath: string
  footprintSize: FootprintSize
  position: Vector3Tuple
  rotationY: number
}

export interface InteractiveFurnitureProps {
  id: string
  position: Vector3Tuple
  rotationY: number
  sourceScene: Object3D
  selected: boolean
  onObjectReady: (id: string, object: Object3D | null) => void
  onSelect: (id: string) => void
  onMoveStart: (id: string, event: ThreeEvent<PointerEvent>) => void
  onMove: (id: string, event: ThreeEvent<PointerEvent>) => void
  onMoveEnd: (id: string, event: ThreeEvent<PointerEvent>) => void
}
