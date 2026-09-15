// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearCollectionBytes,
  fetchCollectionBytes,
  releaseCollectionBytes,
  warmCollectionBytes,
} from './collection-bytes'

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
  clearCollectionBytes()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('collection-bytes', () => {
  it('downloads and resolves with the bytes', async () => {
    const bytes = new Uint8Array([1, 2, 3, 4])
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamingResponse(bytes)))

    expect(new Uint8Array(await fetchCollectionBytes('/a.glb'))).toEqual(bytes)
  })

  it('shares one request between a warm and a later consumer', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(streamingResponse(new Uint8Array([9, 9])))
    vi.stubGlobal('fetch', fetchMock)

    warmCollectionBytes(['/b.glb'])

    expect(new Uint8Array(await fetchCollectionBytes('/b.glb'))).toEqual(
      new Uint8Array([9, 9]),
    )
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('does not refetch a path that is in flight or buffered', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(streamingResponse(new Uint8Array([1])))
    vi.stubGlobal('fetch', fetchMock)

    const first = fetchCollectionBytes('/c.glb')
    const second = fetchCollectionBytes('/c.glb')
    await Promise.all([first, second])
    await fetchCollectionBytes('/c.glb')

    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('rejects on a failed fetch and forgets the entry so the next call retries', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        streamingResponse(new Uint8Array([0]), { ok: false, status: 500 }),
      )
      .mockResolvedValueOnce(streamingResponse(new Uint8Array([7])))
    vi.stubGlobal('fetch', fetchMock)

    await expect(fetchCollectionBytes('/d.glb')).rejects.toThrow(/d\.glb/)

    expect(new Uint8Array(await fetchCollectionBytes('/d.glb'))).toEqual(
      new Uint8Array([7]),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('release() drops a buffered result so a fresh request refetches', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamingResponse(new Uint8Array([1])))
      .mockResolvedValueOnce(streamingResponse(new Uint8Array([2])))
    vi.stubGlobal('fetch', fetchMock)

    await fetchCollectionBytes('/e.glb')
    releaseCollectionBytes('/e.glb')

    expect(new Uint8Array(await fetchCollectionBytes('/e.glb'))).toEqual(
      new Uint8Array([2]),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('clear() lets a fresh cycle refetch the same path', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(streamingResponse(new Uint8Array([1])))
      .mockResolvedValueOnce(streamingResponse(new Uint8Array([2])))
    vi.stubGlobal('fetch', fetchMock)

    await fetchCollectionBytes('/f.glb')

    clearCollectionBytes()

    expect(new Uint8Array(await fetchCollectionBytes('/f.glb'))).toEqual(
      new Uint8Array([2]),
    )
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
