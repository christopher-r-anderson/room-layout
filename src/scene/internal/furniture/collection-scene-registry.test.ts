import { afterEach, describe, expect, it } from 'vitest'
import { Object3D } from 'three'
import {
  getLoadedCollectionScenes,
  registerCollectionScene,
  resetCollectionSceneRegistry,
} from './collection-scene-registry'

afterEach(() => {
  resetCollectionSceneRegistry()
})

describe('collection-scene-registry', () => {
  it('registers parsed scenes', () => {
    const scene = new Object3D()
    registerCollectionScene('/models/a.glb', scene)
    expect(getLoadedCollectionScenes().get('/models/a.glb')).toBe(scene)
  })

  it('reset drops every parsed scene', () => {
    registerCollectionScene('/models/a.glb', new Object3D())
    registerCollectionScene('/models/b.glb', new Object3D())

    resetCollectionSceneRegistry()

    expect(getLoadedCollectionScenes().size).toBe(0)
  })
})
