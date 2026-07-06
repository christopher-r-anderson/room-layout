import { afterEach, describe, expect, it, vi } from 'vitest'
import { streamFetch } from './stream-fetch'

function streamedResponse(
  chunks: Uint8Array[],
  { contentLength }: { contentLength?: number } = {},
): Response {
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(chunk)
      }
      controller.close()
    },
  })
  return new Response(stream, {
    status: 200,
    headers:
      contentLength !== undefined
        ? { 'content-length': String(contentLength) }
        : {},
  })
}

// A fetch mock that never resolves until its signal aborts, then rejects with
// the abort reason - mirroring how a real stalled/aborted request behaves.
function abortableFetch() {
  return vi.fn(
    (_url: string, options?: { signal?: AbortSignal }) =>
      new Promise<Response>((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(options.signal?.reason as Error)
        })
      }),
  )
}

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('streamFetch', () => {
  it('returns the full buffer and reports cumulative progress', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        streamedResponse([new Uint8Array([1, 2, 3]), new Uint8Array([4, 5])], {
          contentLength: 5,
        }),
      ),
    )

    const received: number[] = []
    const buffer = await streamFetch('/collection.glb', {
      onProgress: ({ receivedBytes }) => received.push(receivedBytes),
    })

    expect(new Uint8Array(buffer)).toEqual(new Uint8Array([1, 2, 3, 4, 5]))
    expect(received).toEqual([3, 5])
  })

  it('throws on a non-ok response', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('', { status: 404 })),
    )

    await expect(streamFetch('/collection.glb')).rejects.toThrow(/404/)
  })

  it('aborts when the transfer stalls past the stall timeout', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('fetch', abortableFetch())

    const promise = streamFetch('/collection.glb', { stallTimeoutMs: 1000 })
    const caught = promise.catch((error: unknown) => error)
    await vi.advanceTimersByTimeAsync(1001)
    const error = await caught
    expect(error).toBeInstanceOf(DOMException)
    expect((error as DOMException).name).toBe('TimeoutError')
    expect((error as DOMException).message).toMatch(/stalled/)
  })

  it('respects an external abort signal', async () => {
    vi.stubGlobal('fetch', abortableFetch())

    const controller = new AbortController()
    const promise = streamFetch('/collection.glb', {
      signal: controller.signal,
    })
    const caught = promise.catch((error: unknown) => error)
    controller.abort()
    const error = await caught
    expect(error).toBeInstanceOf(DOMException)
    expect((error as DOMException).name).toBe('AbortError')
  })
})
