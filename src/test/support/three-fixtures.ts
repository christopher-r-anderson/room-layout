/**
 * Shared Three.js fixtures for unit and integration tests.
 * Provides consistent test objects to avoid duplication.
 */

import { BoxGeometry, MeshStandardMaterial, Mesh } from 'three'

/**
 * Dummy mesh fixture with box geometry and standard material.
 */
export function createDummyMesh(): Mesh {
  const geometry = new BoxGeometry(1, 1, 1)
  const material = new MeshStandardMaterial({ color: 0xff0000 })
  return new Mesh(geometry, material)
}
