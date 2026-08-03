import { describe, expect, it } from 'vitest'
import {
  footprintsOverlap,
  getEdgeSnapDelta,
  getFootprintBounds,
  getFootprintCorners,
} from './furniture-footprint'

const baseFootprint = {
  centerX: 0,
  centerZ: 0,
  rotationY: 0,
  size: {
    width: 2,
    depth: 1,
  },
}

describe('furniture-footprint', () => {
  it('returns expected corners for an unrotated footprint', () => {
    expect(getFootprintCorners(baseFootprint)).toEqual([
      { x: -1, z: -0.5 },
      { x: 1, z: -0.5 },
      { x: 1, z: 0.5 },
      { x: -1, z: 0.5 },
    ])
  })

  it('rotates corners in the same sense as a three.js Y rotation', () => {
    const angle = Math.PI / 6
    const corners = getFootprintCorners({
      ...baseFootprint,
      rotationY: angle,
    })

    // Local corner (1, 0.5) under three's R_y(angle).
    expect(corners[2].x).toBeCloseTo(
      1 * Math.cos(angle) + 0.5 * Math.sin(angle),
    )
    expect(corners[2].z).toBeCloseTo(
      -1 * Math.sin(angle) + 0.5 * Math.cos(angle),
    )
  })

  it('returns rotated bounds around the center', () => {
    const bounds = getFootprintBounds({
      ...baseFootprint,
      rotationY: Math.PI / 2,
    })

    expect(bounds.minX).toBeCloseTo(-0.5)
    expect(bounds.maxX).toBeCloseTo(0.5)
    expect(bounds.minZ).toBeCloseTo(-1)
    expect(bounds.maxZ).toBeCloseTo(1)
  })

  it('detects overlap for intersecting oriented footprints', () => {
    const a = {
      ...baseFootprint,
      centerX: 0,
      centerZ: 0,
      rotationY: Math.PI / 6,
    }
    const b = {
      ...baseFootprint,
      centerX: 0.8,
      centerZ: 0,
      rotationY: -Math.PI / 8,
    }

    expect(footprintsOverlap(a, b)).toBe(true)
  })

  it('does not treat edge-touching footprints as overlap', () => {
    const a = {
      ...baseFootprint,
      centerX: 0,
      centerZ: 0,
    }
    const b = {
      ...baseFootprint,
      centerX: 2,
      centerZ: 0,
    }

    expect(footprintsOverlap(a, b)).toBe(false)
  })

  it('returns closest snap delta for nearby edges', () => {
    const moving = {
      ...baseFootprint,
      centerX: -1.95,
      centerZ: 0,
    }
    const target = {
      ...baseFootprint,
      centerX: 0,
      centerZ: 0,
    }

    const snapDelta = getEdgeSnapDelta(moving, target, 0.1)

    expect(snapDelta).not.toBeNull()
    expect(snapDelta?.x).toBeCloseTo(-0.05)
    expect(snapDelta?.z).toBeCloseTo(0)
  })

  it('snaps along oriented edge normals for rotated footprints', () => {
    const rotationY = Math.PI / 4
    // The rotated width edge under three's R_y: local +X maps to (cos, -sin).
    const edgeAxis = {
      x: Math.cos(rotationY),
      z: -Math.sin(rotationY),
    }

    const target = {
      ...baseFootprint,
      centerX: 0,
      centerZ: 0,
      rotationY,
    }

    const moving = {
      ...baseFootprint,
      centerX: edgeAxis.x * 2.05,
      centerZ: edgeAxis.z * 2.05,
      rotationY,
    }

    const snapDelta = getEdgeSnapDelta(moving, target, 0.2)

    expect(snapDelta).not.toBeNull()
    expect(snapDelta?.x).toBeCloseTo(-edgeAxis.x * 0.05, 3)
    expect(snapDelta?.z).toBeCloseTo(-edgeAxis.z * 0.05, 3)
  })
})
