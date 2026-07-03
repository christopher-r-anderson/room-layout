import { afterEach, describe, expect, it } from 'vitest'
import { Object3D } from 'three'
import {
  collectionScenesActions,
  ensureCollectionLoaded,
  getLoadedCollectionScenes,
  resetCollectionScenes,
} from './collection-scenes-store'

afterEach(() => {
  resetCollectionScenes()
})

describe('collection-scenes-store', () => {
  it('registers parsed scenes', () => {
    const scene = new Object3D()
    collectionScenesActions.registerScene('/models/a.glb', scene)
    expect(getLoadedCollectionScenes().get('/models/a.glb')).toBe(scene)
  })

  it('resolves ensureCollectionLoaded immediately for an already-loaded collection', async () => {
    collectionScenesActions.registerScene('/models/a.glb', new Object3D())
    await expect(
      ensureCollectionLoaded('/models/a.glb'),
    ).resolves.toBeUndefined()
  })

  it('resolves ensureCollectionLoaded once the collection registers', async () => {
    let resolved = false
    const pending = ensureCollectionLoaded('/models/b.glb').then(() => {
      resolved = true
    })

    // Still pending until the loader registers the parsed scene.
    await Promise.resolve()
    expect(resolved).toBe(false)

    collectionScenesActions.registerScene('/models/b.glb', new Object3D())
    await pending
    expect(resolved).toBe(true)
  })

  it('reset clears loaded and wanted state', () => {
    collectionScenesActions.registerScene('/models/a.glb', new Object3D())
    collectionScenesActions.wantCollection('/models/c.glb')

    resetCollectionScenes()

    expect(getLoadedCollectionScenes().size).toBe(0)
  })
})
