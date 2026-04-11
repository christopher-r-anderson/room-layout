import { Group, Mesh } from 'three'
import { getMeshes } from './get-meshes'
import { expect, it } from 'vitest'

it('collects all meshes in a hierarchy', () => {
  const root = new Group()
  const mesh1 = new Mesh()
  const mesh2 = new Mesh()
  const nested = new Group()

  nested.add(mesh2)
  root.add(mesh1, nested)

  const result = getMeshes(root)

  expect(result).toHaveLength(2)
  expect(result).toContain(mesh1)
  expect(result).toContain(mesh2)
})

it('returns empty array if no meshes exist', () => {
  const group = new Group()

  const result = getMeshes(group)

  expect(result).toEqual([])
})
