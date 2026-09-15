import { Mesh, Object3D } from 'three'
import { isMesh } from './is-mesh'
import { expect, it } from 'vitest'

it('returns true for Mesh', () => {
  expect(isMesh(new Mesh())).toBe(true)
})

it('returns false for non-mesh', () => {
  expect(isMesh(new Object3D())).toBe(false)
})
