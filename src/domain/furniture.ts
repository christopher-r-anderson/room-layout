import type { Vector3Tuple } from 'three'

// Adding a new kind requires updating both this union and the
// KNOWN_FURNITURE_KINDS allowlist in src/features/startup/catalog-manifest.ts.
export type FurnitureKind = 'armchair' | 'couch' | 'coffee-table' | 'end-table'

export interface FootprintSize {
  width: number
  depth: number
}

export interface FurnitureInstance {
  id: string
  catalogId: string
  position: Vector3Tuple
  rotationY: number
}

export interface FurnitureItem extends FurnitureInstance {
  name: string
  kind: FurnitureKind
  collectionId: string
  nodeName: string
  uiBoundsNodeName?: string
  sourcePath: string
  footprintSize: FootprintSize
}
