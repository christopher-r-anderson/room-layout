import { BoxGeometry, MeshStandardMaterial, Mesh } from 'three'

export function createDummyMesh(): Mesh {
  const geometry = new BoxGeometry(1, 1, 1)
  const material = new MeshStandardMaterial({ color: 0xff0000 })
  return new Mesh(geometry, material)
}
