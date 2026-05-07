import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchCatalogManifest,
  ManifestNetworkError,
  ManifestValidationError,
} from './catalog-manifest'

const assetPathMocks = vi.hoisted(() => ({
  resolvePublicAssetPath: vi.fn((p: string) => `/__base__/${p}`),
}))

vi.mock('@/lib/asset-path', () => ({
  resolvePublicAssetPath: assetPathMocks.resolvePublicAssetPath,
}))

const VALID_MANIFEST = {
  version: 1,
  collections: [
    { id: 'col-1', modelPath: 'models/col-1.glb' },
    { id: 'col-2', modelPath: 'models/col-2.glb' },
  ],
  catalog: [
    {
      id: 'item-1',
      name: 'Test Couch',
      kind: 'couch',
      collectionId: 'col-1',
      nodeName: 'couch-node',
      footprintSize: { width: 2.0, depth: 1.0 },
      previewPath: 'catalog-previews/test-couch.webp',
    },
    {
      id: 'item-2',
      name: 'Test Armchair',
      kind: 'armchair',
      collectionId: 'col-2',
      nodeName: 'armchair-node',
      footprintSize: { width: 1.0, depth: 1.0 },
      previewPath: 'catalog-previews/test-armchair.webp',
    },
  ],
}

function mockFetchOk(body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      statusText: 'OK',
      json: () => Promise.resolve(body),
    }),
  )
}

function mockFetchStatus(status: number, statusText: string) {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      status,
      statusText,
      json: () => Promise.resolve(null),
    }),
  )
}

function mockFetchNetworkError(message: string) {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError(message)))
}

describe('fetchCatalogManifest', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    assetPathMocks.resolvePublicAssetPath.mockImplementation(
      (p: string) => `/__base__/${p}`,
    )
  })

  describe('happy path', () => {
    it('returns parsed catalog and collections for a valid manifest', async () => {
      mockFetchOk(VALID_MANIFEST)

      const result = await fetchCatalogManifest()

      expect(result.collections).toHaveLength(2)
      expect(result.catalog).toHaveLength(2)
    })

    it('resolves collection model paths', async () => {
      mockFetchOk(VALID_MANIFEST)

      const result = await fetchCatalogManifest()

      expect(result.collections[0].sourcePath).toBe(
        '/__base__/models/col-1.glb',
      )
      expect(result.collections[1].sourcePath).toBe(
        '/__base__/models/col-2.glb',
      )
    })

    it('resolves catalog preview paths', async () => {
      mockFetchOk(VALID_MANIFEST)

      const result = await fetchCatalogManifest()

      expect(result.catalog[0].previewPath).toBe(
        '/__base__/catalog-previews/test-couch.webp',
      )
    })

    it('preserves catalog entry fields', async () => {
      mockFetchOk(VALID_MANIFEST)

      const result = await fetchCatalogManifest()
      const item = result.catalog[0]

      expect(item.id).toBe('item-1')
      expect(item.name).toBe('Test Couch')
      expect(item.kind).toBe('couch')
      expect(item.collectionId).toBe('col-1')
      expect(item.nodeName).toBe('couch-node')
      expect(item.footprintSize).toEqual({ width: 2.0, depth: 1.0 })
    })

    it('fetches from catalog-manifest.json by default', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(VALID_MANIFEST),
      })
      vi.stubGlobal('fetch', fetchSpy)

      await fetchCatalogManifest()

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('catalog-manifest.json'),
      )
    })

    it('passes AbortSignal to fetch when provided', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: 'OK',
        json: () => Promise.resolve(VALID_MANIFEST),
      })
      vi.stubGlobal('fetch', fetchSpy)
      const controller = new AbortController()

      await fetchCatalogManifest('catalog-manifest.json', {
        signal: controller.signal,
      })

      expect(fetchSpy).toHaveBeenCalledWith(
        expect.stringContaining('catalog-manifest.json'),
        { signal: controller.signal },
      )
    })
  })

  describe('network errors', () => {
    it('throws ManifestNetworkError on fetch failure', async () => {
      mockFetchNetworkError('Failed to connect')

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestNetworkError,
      )
    })

    it('throws ManifestNetworkError on non-ok HTTP response', async () => {
      mockFetchStatus(404, 'Not Found')

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestNetworkError,
      )
    })

    it('includes the status code in the error message for non-ok response', async () => {
      mockFetchStatus(404, 'Not Found')

      await expect(fetchCatalogManifest()).rejects.toThrow('404')
    })
  })

  describe('validation errors', () => {
    it('throws ManifestValidationError when manifest URL is not a relative path', async () => {
      mockFetchOk(VALID_MANIFEST)

      await expect(
        fetchCatalogManifest('https://cdn.example.com/catalog-manifest.json'),
      ).rejects.toBeInstanceOf(ManifestValidationError)
    })

    it('throws ManifestValidationError when root is not an object', async () => {
      mockFetchOk('not-an-object')

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when "version" is missing', async () => {
      mockFetchOk({ ...VALID_MANIFEST, version: undefined })

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when "collections" is missing', async () => {
      mockFetchOk({ ...VALID_MANIFEST, collections: undefined })

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when "catalog" is missing', async () => {
      mockFetchOk({ ...VALID_MANIFEST, catalog: undefined })

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when catalog entry has unknown kind', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          {
            ...VALID_MANIFEST.catalog[0],
            kind: 'spaceship',
          },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when collectionId does not reference a defined collection', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          {
            ...VALID_MANIFEST.catalog[0],
            collectionId: 'nonexistent-collection',
          },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when footprintSize width is non-positive', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          {
            ...VALID_MANIFEST.catalog[0],
            footprintSize: { width: 0, depth: 1 },
          },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when modelPath is an absolute URL', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        collections: [
          { id: 'col-1', modelPath: 'https://cdn.example.com/model.glb' },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when previewPath is protocol-relative', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          {
            ...VALID_MANIFEST.catalog[0],
            previewPath: '//cdn.example.com/preview.webp',
          },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when modelPath contains path traversal', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        collections: [{ id: 'col-1', modelPath: '../models/col-1.glb' }],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when modelPath contains encoded traversal tokens', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        collections: [{ id: 'col-1', modelPath: '%2e%2e/models/col-1.glb' }],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when previewPath contains encoded separator tokens', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          {
            ...VALID_MANIFEST.catalog[0],
            previewPath: 'catalog-previews%2ftest-couch.webp',
          },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when previewPath uses backslashes', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          {
            ...VALID_MANIFEST.catalog[0],
            previewPath: 'catalog-previews\\test-couch.webp',
          },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('normalizes safe percent-encoded path characters before resolving paths', async () => {
      const manifestWithEncodedSpaces = {
        ...VALID_MANIFEST,
        collections: [{ id: 'col-1', modelPath: 'models/col%201.glb' }],
        catalog: [
          {
            ...VALID_MANIFEST.catalog[0],
            collectionId: 'col-1',
            previewPath: 'catalog-previews/test%20couch.webp',
          },
        ],
      }

      mockFetchOk(manifestWithEncodedSpaces)

      await fetchCatalogManifest()

      expect(assetPathMocks.resolvePublicAssetPath).toHaveBeenCalledWith(
        'models/col%201.glb',
      )
      expect(assetPathMocks.resolvePublicAssetPath).toHaveBeenCalledWith(
        'catalog-previews/test%20couch.webp',
      )
    })

    it('throws ManifestValidationError when collections array is empty', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        collections: [],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when catalog array is empty', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when version is NaN', async () => {
      mockFetchOk({ ...VALID_MANIFEST, version: NaN })

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when version is Infinity', async () => {
      mockFetchOk({ ...VALID_MANIFEST, version: Infinity })

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when version is unsupported', async () => {
      mockFetchOk({ ...VALID_MANIFEST, version: 2 })

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('includes the version number in the error message for unsupported version', async () => {
      mockFetchOk({ ...VALID_MANIFEST, version: 99 })

      await expect(fetchCatalogManifest()).rejects.toThrow('99')
    })

    it('throws ManifestValidationError when footprintSize width is NaN', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          {
            ...VALID_MANIFEST.catalog[0],
            footprintSize: { width: NaN, depth: 1 },
          },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when footprintSize depth is Infinity', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          {
            ...VALID_MANIFEST.catalog[0],
            footprintSize: { width: 1, depth: Infinity },
          },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('throws ManifestValidationError when collections contain duplicate ids', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        collections: [
          { id: 'col-1', modelPath: 'models/col-1.glb' },
          { id: 'col-1', modelPath: 'models/col-1-alt.glb' },
        ],
        catalog: [VALID_MANIFEST.catalog[0]],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('includes the duplicate id in the error message for duplicate collection ids', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        collections: [
          { id: 'col-dup', modelPath: 'models/a.glb' },
          { id: 'col-dup', modelPath: 'models/b.glb' },
        ],
        catalog: [{ ...VALID_MANIFEST.catalog[0], collectionId: 'col-dup' }],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toThrow('col-dup')
    })

    it('throws ManifestValidationError when catalog entries contain duplicate ids', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          VALID_MANIFEST.catalog[0],
          { ...VALID_MANIFEST.catalog[1], id: VALID_MANIFEST.catalog[0].id },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toBeInstanceOf(
        ManifestValidationError,
      )
    })

    it('includes the duplicate id in the error message for duplicate catalog ids', async () => {
      const badManifest = {
        ...VALID_MANIFEST,
        catalog: [
          { ...VALID_MANIFEST.catalog[0], id: 'item-dup' },
          { ...VALID_MANIFEST.catalog[1], id: 'item-dup' },
        ],
      }
      mockFetchOk(badManifest)

      await expect(fetchCatalogManifest()).rejects.toThrow('item-dup')
    })
  })
})
