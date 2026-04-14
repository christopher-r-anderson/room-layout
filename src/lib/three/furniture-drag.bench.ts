import { bench, describe } from 'vitest'
import { Plane, Ray, Vector3 } from 'three'
import { clampToBounds, snapToGrid } from './furniture-drag'

const rayCount = 256
const rays = Array.from({ length: rayCount }, (_, index) => {
  const x = ((index % 16) - 8) * 0.3
  const z = (Math.floor(index / 16) - 8) * 0.3

  return new Ray(new Vector3(x, 4, z), new Vector3(0, -1, 0))
})

const dragOffset = { x: 0.21, z: -0.17 }
const bounds = {
  minX: -3,
  maxX: 3,
  minZ: -3,
  maxZ: 3,
}
const snapSize = 0.5
const floorNormal = new Vector3(0, 1, 0)
const scratchPlane = new Plane(floorNormal, 0)
const scratchIntersection = new Vector3()

let rayIndex = 0

function runScratchIteration() {
  const ray = rays[rayIndex]
  rayIndex = (rayIndex + 1) % rays.length

  scratchPlane.set(floorNormal, 0)
  const intersection = ray.intersectPlane(scratchPlane, scratchIntersection)

  if (!intersection) {
    return null
  }

  const nextX = clampToBounds(
    snapToGrid(intersection.x + dragOffset.x, snapSize),
    bounds.minX,
    bounds.maxX,
  )
  const nextZ = clampToBounds(
    snapToGrid(intersection.z + dragOffset.z, snapSize),
    bounds.minZ,
    bounds.maxZ,
  )

  return [nextX, 0.75, nextZ]
}

function runAllocateIteration() {
  const ray = rays[rayIndex]
  rayIndex = (rayIndex + 1) % rays.length

  const intersection = ray.intersectPlane(
    new Plane(floorNormal, 0),
    new Vector3(),
  )

  if (!intersection) {
    return null
  }

  const nextX = clampToBounds(
    snapToGrid(intersection.x + dragOffset.x, snapSize),
    bounds.minX,
    bounds.maxX,
  )
  const nextZ = clampToBounds(
    snapToGrid(intersection.z + dragOffset.z, snapSize),
    bounds.minZ,
    bounds.maxZ,
  )

  return [nextX, 0.75, nextZ]
}

describe('furniture drag intersection strategy', () => {
  bench('scratch-object reuse', () => {
    runScratchIteration()
  })

  bench('allocate per call', () => {
    runAllocateIteration()
  })
})
