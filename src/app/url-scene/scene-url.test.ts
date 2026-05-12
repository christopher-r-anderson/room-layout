import { describe, expect, it } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import {
  SCENE_URL_MAX_ENCODED_LENGTH,
  SCENE_URL_PARAM,
  parseSceneUrl,
  serializeSceneToUrl,
  validateCatalogReferences,
} from './scene-url'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface ScenePayload {
  v: number
  floorFinishId?: string
  wallFinishId?: string
  items: {
    id: string
    catalogId: string
    position: [number, number, number]
    rotationY: number
  }[]
}

function requireSceneUrl(items: FurnitureItem[], href: string): string {
  const result = serializeSceneToUrl(items, href)
  if (result === null) throw new Error('expected non-null URL')
  return result
}

function parsePayload(url: string): ScenePayload {
  const parsed = new URL(url)
  const raw = parsed.searchParams.get(SCENE_URL_PARAM)
  if (raw === null) throw new Error('scene param missing')
  return JSON.parse(raw) as ScenePayload
}

function makeFurnitureItem(overrides?: Partial<FurnitureItem>): FurnitureItem {
  return {
    id: 'furniture-instance-1',
    catalogId: 'catalog-chair',
    name: 'Chair',
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [1.234, 0, -2.345],
    rotationY: 1.5708,
    ...overrides,
  }
}

function makeCatalogEntry(id: string): FurnitureCatalogEntry {
  return {
    id,
    name: 'Chair',
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    footprintSize: { width: 1, depth: 1 },
    previewPath: '/previews/chair.png',
  }
}

// ---------------------------------------------------------------------------
// serializeSceneToUrl
// ---------------------------------------------------------------------------

describe('serializeSceneToUrl', () => {
  it('encodes items into the scene param', () => {
    const items = [makeFurnitureItem()]
    const url = new URL(requireSceneUrl(items, 'https://example.com/'))
    expect(url.searchParams.has(SCENE_URL_PARAM)).toBe(true)
  })

  it('preserves unrelated query params and hash', () => {
    const items = [makeFurnitureItem()]
    const url = new URL(
      requireSceneUrl(items, 'https://example.com/?other=123#section'),
    )
    expect(url.searchParams.get('other')).toBe('123')
    expect(url.hash).toBe('#section')
  })

  it('replaces an existing scene param', () => {
    const items = [makeFurnitureItem()]
    const url = new URL(
      requireSceneUrl(items, 'https://example.com/?scene=OLD_VALUE'),
    )
    const values = url.searchParams.getAll(SCENE_URL_PARAM)
    expect(values).toHaveLength(1)
    expect(values[0]).not.toBe('OLD_VALUE')
  })

  it('sorts items by id for deterministic output', () => {
    const items = [
      makeFurnitureItem({ id: 'furniture-instance-3' }),
      makeFurnitureItem({ id: 'furniture-instance-1' }),
      makeFurnitureItem({ id: 'furniture-instance-2' }),
    ]
    const payload = parsePayload(requireSceneUrl(items, 'https://example.com/'))
    expect(payload.items.map((i) => i.id)).toEqual([
      'furniture-instance-1',
      'furniture-instance-2',
      'furniture-instance-3',
    ])
  })

  it('rounds positions to 3 decimal places', () => {
    const items = [makeFurnitureItem({ position: [1.23456789, 0, -2.9999999] })]
    const payload = parsePayload(requireSceneUrl(items, 'https://example.com/'))
    const pos = payload.items[0].position
    expect(pos[0]).toBe(1.235)
    expect(pos[2]).toBe(-3)
  })

  it('rounds rotationY to 3 decimal places', () => {
    const items = [makeFurnitureItem({ rotationY: 1.23456789 })]
    const payload = parsePayload(requireSceneUrl(items, 'https://example.com/'))
    expect(payload.items[0].rotationY).toBe(1.235)
  })

  it('includes the version field v: 1', () => {
    const payload = parsePayload(requireSceneUrl([], 'https://example.com/'))
    expect(payload.v).toBe(1)
  })

  it('includes floor and wall finish IDs when provided', () => {
    const url = serializeSceneToUrl([], 'https://example.com/', {
      floorFinishId: 'granite-tile',
      wallFinishId: 'sage-green',
    })
    if (url === null) throw new Error('expected non-null URL')
    const payload = parsePayload(url)

    expect(payload.floorFinishId).toBe('granite-tile')
    expect(payload.wallFinishId).toBe('sage-green')
  })

  it('omits finish IDs when not provided', () => {
    const payload = parsePayload(requireSceneUrl([], 'https://example.com/'))

    expect(payload.floorFinishId).toBeUndefined()
    expect(payload.wallFinishId).toBeUndefined()
  })

  it('produces byte-identical output for equivalent inputs', () => {
    const items = [makeFurnitureItem()]
    const r1 = serializeSceneToUrl(items, 'https://example.com/')
    const r2 = serializeSceneToUrl(items, 'https://example.com/')
    expect(r1).toBe(r2)
  })

  it('returns null when the encoded payload exceeds SCENE_URL_MAX_ENCODED_LENGTH', () => {
    // Build a payload that exceeds 4000 encoded chars by using many items
    const longPrefix = 'x'.repeat(40)
    const items = Array.from({ length: 60 }, (_, i) =>
      makeFurnitureItem({
        id: `furniture-instance-${String(i + 1)}`,
        catalogId: `catalog-very-long-id-${longPrefix}-${String(i)}`,
        position: [1.234, 0, -2.345],
        rotationY: 1.5708,
      }),
    )
    const result = serializeSceneToUrl(items, 'https://example.com/')
    expect(result).toBeNull()
  })

  it('handles empty items array', () => {
    const payload = parsePayload(requireSceneUrl([], 'https://example.com/'))
    expect(payload.items).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// parseSceneUrl
// ---------------------------------------------------------------------------

describe('parseSceneUrl', () => {
  it('returns no-param when scene param is absent', () => {
    const result = parseSceneUrl('https://example.com/')
    expect(result).toEqual({ ok: false, reason: 'no-param' })
  })

  it('returns duplicate-param when multiple scene params are present', () => {
    const result = parseSceneUrl('https://example.com/?scene=abc&scene=def')
    expect(result).toEqual({ ok: false, reason: 'duplicate-param' })
  })

  it('returns decode-error for unparseable JSON', () => {
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent('not-json{{')}`,
    )
    expect(result).toEqual({ ok: false, reason: 'decode-error' })
  })

  it('returns invalid-schema when version is wrong', () => {
    const payload = JSON.stringify({ v: 2, items: [] })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: false, reason: 'invalid-schema' })
  })

  it('returns invalid-schema when items is missing', () => {
    const payload = JSON.stringify({ v: 1 })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: false, reason: 'invalid-schema' })
  })

  it('returns invalid-schema when an item has a missing required field', () => {
    const payload = JSON.stringify({
      v: 1,
      items: [{ id: 'furniture-instance-1', catalogId: 'cat', rotationY: 0 }],
    })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: false, reason: 'invalid-schema' })
  })

  it('returns invalid-schema when position has wrong length', () => {
    const payload = JSON.stringify({
      v: 1,
      items: [
        {
          id: 'furniture-instance-1',
          catalogId: 'cat',
          position: [1, 2],
          rotationY: 0,
        },
      ],
    })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: false, reason: 'invalid-schema' })
  })

  it('returns invalid-schema when position contains non-finite values', () => {
    const payload = JSON.stringify({
      v: 1,
      items: [
        {
          id: 'furniture-instance-1',
          catalogId: 'cat',
          position: [1, 2, Infinity],
          rotationY: 0,
        },
      ],
    })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: false, reason: 'invalid-schema' })
  })

  it('returns invalid-schema when items contain duplicate ids', () => {
    const payload = JSON.stringify({
      v: 1,
      items: [
        {
          id: 'furniture-instance-1',
          catalogId: 'cat',
          position: [0, 0, 0],
          rotationY: 0,
        },
        {
          id: 'furniture-instance-1',
          catalogId: 'cat',
          position: [1, 0, 1],
          rotationY: 0,
        },
      ],
    })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: false, reason: 'invalid-schema' })
  })

  it('returns invalid-schema when floorFinishId is empty', () => {
    const payload = JSON.stringify({ v: 1, items: [], floorFinishId: '' })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: false, reason: 'invalid-schema' })
  })

  it('returns invalid-schema when wallFinishId is not a string', () => {
    const payload = JSON.stringify({ v: 1, items: [], wallFinishId: 42 })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: false, reason: 'invalid-schema' })
  })

  it('returns over-limit when encoded payload exceeds max length', () => {
    // Build a payload guaranteed to exceed 4000 encoded chars.
    // 80 items × ~80 chars each ≈ 6400 chars, well above the limit.
    const longPrefix = 'x'.repeat(40)
    const items = Array.from({ length: 80 }, (_, i) => ({
      id: `furniture-instance-${String(i + 1)}`,
      catalogId: `catalog-long-id-${longPrefix}-${String(i)}`,
      position: [1, 0, 1],
      rotationY: 0,
    }))
    const payload = JSON.stringify({ v: 1, items })
    // Verify the payload actually exceeds the limit (guards against limit change).
    expect(encodeURIComponent(payload).length).toBeGreaterThan(
      SCENE_URL_MAX_ENCODED_LENGTH,
    )
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: false, reason: 'over-limit' })
  })

  it('returns ok with items for a valid payload', () => {
    const expected = {
      id: 'furniture-instance-1',
      catalogId: 'catalog-chair',
      position: [1.234, 0, -2.345] as [number, number, number],
      rotationY: 1.571,
    }
    const payload = JSON.stringify({ v: 1, items: [expected] })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({ ok: true, items: [expected] })
  })

  it('returns ok with optional finish IDs for a valid payload', () => {
    const payload = JSON.stringify({
      v: 1,
      items: [],
      floorFinishId: 'laminate-floor',
      wallFinishId: 'soft-beige',
    })
    const result = parseSceneUrl(
      `https://example.com/?${SCENE_URL_PARAM}=${encodeURIComponent(payload)}`,
    )
    expect(result).toEqual({
      ok: true,
      items: [],
      floorFinishId: 'laminate-floor',
      wallFinishId: 'soft-beige',
    })
  })

  it('is a round-trip with serializeSceneToUrl', () => {
    const items = [
      makeFurnitureItem({
        id: 'furniture-instance-1',
        position: [1, 0, -1],
        rotationY: 0,
      }),
      makeFurnitureItem({
        id: 'furniture-instance-2',
        position: [2, 0, 0],
        rotationY: 1.571,
      }),
    ]
    const url = requireSceneUrl(items, 'https://example.com/')
    const parsed = parseSceneUrl(url)
    expect(parsed.ok).toBe(true)
    if (parsed.ok) {
      expect(parsed.items).toHaveLength(2)
      expect(parsed.items[0].id).toBe('furniture-instance-1')
      expect(parsed.items[1].id).toBe('furniture-instance-2')
    }
  })
})

// ---------------------------------------------------------------------------
// validateCatalogReferences
// ---------------------------------------------------------------------------

describe('validateCatalogReferences', () => {
  it('returns true when all catalog IDs are present', () => {
    const items = [
      {
        id: 'furniture-instance-1',
        catalogId: 'cat-a',
        position: [0, 0, 0] as [number, number, number],
        rotationY: 0,
      },
      {
        id: 'furniture-instance-2',
        catalogId: 'cat-b',
        position: [1, 0, 1] as [number, number, number],
        rotationY: 0,
      },
    ]
    const catalog = [makeCatalogEntry('cat-a'), makeCatalogEntry('cat-b')]
    expect(validateCatalogReferences(items, catalog)).toBe(true)
  })

  it('returns false when any catalog ID is missing', () => {
    const items = [
      {
        id: 'furniture-instance-1',
        catalogId: 'cat-a',
        position: [0, 0, 0] as [number, number, number],
        rotationY: 0,
      },
      {
        id: 'furniture-instance-2',
        catalogId: 'cat-unknown',
        position: [1, 0, 1] as [number, number, number],
        rotationY: 0,
      },
    ]
    const catalog = [makeCatalogEntry('cat-a')]
    expect(validateCatalogReferences(items, catalog)).toBe(false)
  })

  it('returns true for an empty items array', () => {
    const catalog = [makeCatalogEntry('cat-a')]
    expect(validateCatalogReferences([], catalog)).toBe(true)
  })

  it('returns true for an empty items array with empty catalog', () => {
    expect(validateCatalogReferences([], [])).toBe(true)
  })
})
