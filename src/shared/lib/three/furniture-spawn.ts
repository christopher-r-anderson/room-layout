import type { FurnitureItem } from '@/scene/objects/furniture.types'
import {
  resolveMovedFurniturePosition,
  type LayoutBounds,
} from './furniture-layout'

interface FindFurnitureSpawnPositionOptions {
  item: FurnitureItem
  items: FurnitureItem[]
  bounds: LayoutBounds
  edgeSnapThreshold: number
  snapSize: number
}

function roundCoordinate(value: number) {
  return Math.round(value * 1000) / 1000
}

function getAxisCandidateCoordinates(min: number, max: number, step: number) {
  const center = (min + max) / 2
  const coordinates = new Set<number>([roundCoordinate(center)])
  const steps = Math.floor((max - min) / step)

  for (let index = 0; index <= steps; index += 1) {
    coordinates.add(roundCoordinate(min + index * step))
  }

  return [...coordinates].sort((left, right) => {
    const distanceDelta = Math.abs(left - center) - Math.abs(right - center)

    if (distanceDelta !== 0) {
      return distanceDelta
    }

    return left - right
  })
}

export function getFurnitureSpawnCandidates(
  bounds: LayoutBounds,
  y: number,
  snapSize: number,
): [number, number, number][] {
  const candidateXs = getAxisCandidateCoordinates(
    bounds.minX,
    bounds.maxX,
    snapSize,
  )
  const candidateZs = getAxisCandidateCoordinates(
    bounds.minZ,
    bounds.maxZ,
    snapSize,
  )
  const centerX = (bounds.minX + bounds.maxX) / 2
  const centerZ = (bounds.minZ + bounds.maxZ) / 2

  return candidateXs
    .flatMap((x) =>
      candidateZs.map((z) => [x, y, z] as [number, number, number]),
    )
    .sort((left, right) => {
      const leftDistance = (left[0] - centerX) ** 2 + (left[2] - centerZ) ** 2
      const rightDistance =
        (right[0] - centerX) ** 2 + (right[2] - centerZ) ** 2

      if (leftDistance !== rightDistance) {
        return leftDistance - rightDistance
      }

      if (left[2] !== right[2]) {
        return left[2] - right[2]
      }

      return left[0] - right[0]
    })
}

export function findFurnitureSpawnPosition({
  item,
  items,
  bounds,
  edgeSnapThreshold,
  snapSize,
}: FindFurnitureSpawnPositionOptions): [number, number, number] | null {
  const candidateItems = [...items, item]

  for (const candidatePosition of getFurnitureSpawnCandidates(
    bounds,
    item.position[1],
    snapSize,
  )) {
    const resolvedPosition = resolveMovedFurniturePosition({
      movingId: item.id,
      proposedPosition: candidatePosition,
      items: candidateItems,
      edgeSnapThreshold,
      bounds,
    })

    if (resolvedPosition) {
      return resolvedPosition
    }
  }

  return null
}
