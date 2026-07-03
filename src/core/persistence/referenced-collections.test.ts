import { describe, expect, it } from 'vitest'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/domain/catalog'
import type { FurnitureInstance } from '@/domain/furniture'
import type { SceneDraftState } from './scene-draft'
import { resolveReferencedCollectionPaths } from './referenced-collections'

const catalog: FurnitureCatalogEntry[] = [
  {
    id: 'chair',
    name: 'Chair',
    kind: 'armchair',
    collectionId: 'col-a',
    nodeName: 'ChairNode',
    footprintSize: { width: 1, depth: 1 },
    previewPath: '/previews/chair.png',
  },
  {
    id: 'table',
    name: 'Table',
    kind: 'armchair',
    collectionId: 'col-b',
    nodeName: 'TableNode',
    footprintSize: { width: 1, depth: 1 },
    previewPath: '/previews/table.png',
  },
]

const collections: FurnitureCollection[] = [
  { id: 'col-a', sourcePath: '/models/a.glb' },
  { id: 'col-b', sourcePath: '/models/b.glb' },
]

function instance(catalogId: string, id = `i-${catalogId}`): FurnitureInstance {
  return { id, catalogId, position: [0, 0, 0], rotationY: 0 }
}

function sceneRoute(items: FurnitureInstance[]): string {
  const params = new URLSearchParams()
  params.set('scene', JSON.stringify({ v: 1, items }))
  return `http://localhost/?${params.toString()}`
}

function draft(items: FurnitureInstance[]): SceneDraftState {
  return { items }
}

describe('resolveReferencedCollectionPaths', () => {
  it('resolves collection paths from a valid ?scene= URL', () => {
    expect(
      resolveReferencedCollectionPaths({
        href: sceneRoute([instance('chair')]),
        draft: null,
        catalog,
        collections,
      }),
    ).toEqual(['/models/a.glb'])
  })

  it('prefers the URL over a local draft', () => {
    expect(
      resolveReferencedCollectionPaths({
        href: sceneRoute([instance('chair')]),
        draft: draft([instance('table')]),
        catalog,
        collections,
      }),
    ).toEqual(['/models/a.glb'])
  })

  it('falls back to the draft when the URL has no scene param', () => {
    expect(
      resolveReferencedCollectionPaths({
        href: 'http://localhost/',
        draft: draft([instance('table')]),
        catalog,
        collections,
      }),
    ).toEqual(['/models/b.glb'])
  })

  it('returns an empty set for a fresh/empty scene', () => {
    expect(
      resolveReferencedCollectionPaths({
        href: 'http://localhost/',
        draft: null,
        catalog,
        collections,
      }),
    ).toEqual([])
  })

  it('dedupes collections referenced by multiple items', () => {
    expect(
      resolveReferencedCollectionPaths({
        href: sceneRoute([instance('chair', 'i-1'), instance('chair', 'i-2')]),
        draft: null,
        catalog,
        collections,
      }),
    ).toEqual(['/models/a.glb'])
  })

  it('ignores a draft that references an unknown catalog id', () => {
    expect(
      resolveReferencedCollectionPaths({
        href: 'http://localhost/',
        draft: draft([instance('does-not-exist')]),
        catalog,
        collections,
      }),
    ).toEqual([])
  })
})
