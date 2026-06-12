import { expect, it } from 'vitest'
import { Group, Mesh } from 'three'
import { getClonedNode } from './get-cloned-node'

it('returns a cloned node by name', () => {
  const scene = new Group()
  const mesh = new Mesh()
  mesh.name = 'chair'
  scene.add(mesh)

  const result = getClonedNode(scene, 'chair')

  expect(result).not.toBe(mesh)
  expect(result.name).toBe('chair')
})

it('throws if node is not found', () => {
  const scene = new Group()

  expect(() => getClonedNode(scene, 'missing')).toThrow(
    'missing node not found in GLTF scene',
  )
})
