// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearFurnitureAssetPrefetch,
  prefetchFurnitureCollections,
  whenPrefetched,
} from './furniture-asset-prefetch'

function streamingResponse(
  bytes: Uint8Array,
  { contentLength = bytes.length, ok = true, status = 200 } = {},
) {
  let sent = false
  return {
    ok,
    status,
    headers: {
      get: (key: string) =>
        key.toLowerCase() === 'content-length' ? String(contentLength) : null,
    },
    body: {
      getReader: () => ({
        read: () =>
          sent
            ? Promise.resolve({ done: true, value: undefined })
            : ((sent = true), Promise.resolve({ done: false, value: bytes })),
      }),
    },
    arrayBuffer: () => Promise.resolve(bytes.buffer),
  } as unknown as Response
}

beforeEach(() => {
  clearFurnitureAssetPrefetch()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('furniture-asset-prefetch', () => {
  it('downloads bytes and resolves whenPrefetched with them', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamingResponse(bytes)))

    prefetchFurnitureCollections(['/a.glb'])

    expect(new Uint8Array(await whenPrefetched('/a.glb'))).toEqual(bytes)
  })

  it('resolves a waiter that requested the URL before prefetch started', async () => {
    const bytes = new Uint8Array([9, 9])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamingResponse(bytes)))

    // The Scene can remount and await a URL before the retry's re-prefetch runs.
    const waiter = whenPrefetched('/b.glb')
    prefetchFurnitureCollections(['/b.glb'])

    expect(new Uint8Array(await waiter)).toEqual(bytes)
  })

  it('does not refetch a URL that is already in flight or done', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(streamingResponse(new Uint8Array([1])))
    vi.stubGlobal('fetch', fetchMock)

    prefetchFurnitureCollections(['/c.glb'])
    prefetchFurnitureCollections(['/c.glb'])
    await whenPrefetched('/c.glb')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects whenPrefetched when the fetch fails', async () => {
    vi.stubGlobal(
      'fetch',
      vi
        .fn()
        .mockResolvedValue(
          streamingResponse(new Uint8Array([0]), { ok: false, status: 500 }),
        ),
    )

    prefetchFurnitureCollections(['/d.glb'])

    await expect(whenPrefetched('/d.glb')).rejects.toThrow(/d\.glb/)
  })

  it('clear() lets a fresh cycle re-fetch and resolve the same URL', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamingResponse(new Uint8Array([1])))
      .mockResolvedValueOnce(streamingResponse(new Uint8Array([2])))
    vi.stubGlobal('fetch', fetchMock)

    prefetchFurnitureCollections(['/e.glb'])
    await whenPrefetched('/e.glb')

    clearFurnitureAssetPrefetch()
    prefetchFurnitureCollections(['/e.glb'])

    expect(new Uint8Array(await whenPrefetched('/e.glb'))).toEqual(
      new Uint8Array([2]),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
