import { bench, describe } from 'vitest'
import {
  getEdgeSnapDelta,
  type FurnitureFootprint,
} from './furniture-footprint'

const baseSize = { width: 2, depth: 1 }

const unrotatedTarget: FurnitureFootprint = {
  centerX: 0,
  centerZ: 0,
  rotationY: 0,
  size: baseSize,
}

const unrotatedMoving: FurnitureFootprint = {
  centerX: -1.95,
  centerZ: 0,
  rotationY: 0,
  size: baseSize,
}

const rotatedAngle = Math.PI / 4
const rotatedAxis = {
  x: Math.cos(rotatedAngle),
  z: Math.sin(rotatedAngle),
}

const rotatedTarget: FurnitureFootprint = {
  centerX: 0,
  centerZ: 0,
  rotationY: rotatedAngle,
  size: baseSize,
}

const rotatedMoving: FurnitureFootprint = {
  centerX: rotatedAxis.x * 2.05,
  centerZ: rotatedAxis.z * 2.05,
  rotationY: rotatedAngle,
  size: baseSize,
}

describe('furniture footprint edge snap', () => {
  bench('unrotated near-edge candidate', () => {
    getEdgeSnapDelta(unrotatedMoving, unrotatedTarget, 0.1)
  })

  bench('rotated near-edge candidate', () => {
    getEdgeSnapDelta(rotatedMoving, rotatedTarget, 0.2)
  })
})
