import { afterEach, describe, expect, it, vi } from 'vitest'
import { Object3D, type WebGLRenderer } from 'three'
import type { FurnitureCatalogEntry } from '@/domain/catalog'
import {
  getLoadedCollectionScenes,
  resetCollectionSceneRegistry,
} from './collection-scene-registry'
import { createCollectionSceneLoader } from './collection-scene-loader'

const { parseAsyncMock } = vi.hoisted(() => ({
  parseAsyncMock: vi.fn<() => Promise<{ scene: Object3D }>>(),
}))

vi.mock('three/addons/loaders/GLTFLoader.js', () => ({
  GLTFLoader: class {
    parseAsync = parseAsyncMock
  },
}))

// The KTX2 setup needs a live renderer/worker; irrelevant to this contract.
vi.mock('@/scene/internal/three/ktx2-loader', () => ({
  configureGltfKtx2: vi.fn(),
}))

function entry(
  id: string,
  nodeName: string,
  collectionId = 'col-a',
): FurnitureCatalogEntry {
  return {
    id,
    name: `Item ${id}`,
    kind: 'armchair',
    collectionId,
    nodeName,
    footprintSize: { width: 1, depth: 1 },
    previewPath: `/previews/${id}.png`,
  }
}

function parsedScene(nodeNames: string[]): Object3D {
  const scene = new Object3D()
  for (const name of nodeNames) {
    const node = new Object3D()
    node.name = name
    scene.add(node)
  }
  return scene
}

const renderer = {} as WebGLRenderer
const collections = [{ id: 'col-a', sourcePath: '/models/a.glb' }]

afterEach(() => {
  vi.clearAllMocks()
  resetCollectionSceneRegistry()
})

describe('createCollectionSceneLoader', () => {
  it('parses, validates the collection entries, and registers the scene', async () => {
    const scene = parsedScene(['ChairNode'])
    parseAsyncMock.mockResolvedValue({ scene })
    const load = createCollectionSceneLoader({
      renderer,
      catalog: [entry('chair', 'ChairNode')],
      collections,
    })

    await load('/models/a.glb', new ArrayBuffer(4))

    expect(getLoadedCollectionScenes().get('/models/a.glb')).toBe(scene)
  })

  it('rejects and does not register when a manifest-referenced node is missing', async () => {
    parseAsyncMock.mockResolvedValue({ scene: parsedScene(['OtherNode']) })
    const load = createCollectionSceneLoader({
      renderer,
      catalog: [entry('chair', 'ChairNode')],
      collections,
    })

    await expect(load('/models/a.glb', new ArrayBuffer(4))).rejects.toThrow(
      /ChairNode node not found/,
    )
    expect(getLoadedCollectionScenes().size).toBe(0)
  })

  it('validates only the entries of the parsed collection', async () => {
    parseAsyncMock.mockResolvedValue({ scene: parsedScene(['ChairNode']) })
    const load = createCollectionSceneLoader({
      renderer,
      // The other collection's entry must not be validated against this GLB.
      catalog: [
        entry('chair', 'ChairNode'),
        entry('table', 'TableNode', 'col-b'),
      ],
      collections,
    })

    await expect(
      load('/models/a.glb', new ArrayBuffer(4)),
    ).resolves.toBeUndefined()
  })
})
