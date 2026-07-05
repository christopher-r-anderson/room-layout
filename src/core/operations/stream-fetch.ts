export interface StreamFetchProgress {
  receivedBytes: number
  // Bytes expected from Content-Length, or 0 when the server does not send it.
  totalBytes: number
}

// Thrown for a non-ok HTTP response (the asset is missing/broken). Distinct from
// a network error or a stall abort so callers can treat it as a *permanent*
// failure (retrying will not help) rather than a transient connection problem.
export class AssetHttpError extends Error {
  readonly status: number

  constructor(url: string, status: number) {
    super(`Failed to fetch ${url}: ${String(status)}`)
    this.name = 'AssetHttpError'
    this.status = status
  }
}

// A *stall* timeout (no bytes for this long), not a total-duration one, so a slow
// but progressing connection is not falsely aborted while a truly stuck transfer
// still is.
const DEFAULT_STALL_TIMEOUT_MS = 15_000

// Fetches a URL as an ArrayBuffer, streaming the body so progress is reported and
// a stalled transfer aborts (rejecting) instead of hanging indefinitely. Used by
// every collection download through the shared byte source.
export async function streamFetch(
  url: string,
  {
    signal,
    onProgress,
    stallTimeoutMs = DEFAULT_STALL_TIMEOUT_MS,
  }: {
    signal?: AbortSignal
    onProgress?: (progress: StreamFetchProgress) => void
    stallTimeoutMs?: number
  } = {},
): Promise<ArrayBuffer> {
  const controller = new AbortController()
  const abortFromExternal = () => {
    controller.abort(signal?.reason)
  }
  if (signal) {
    if (signal.aborted) {
      controller.abort(signal.reason)
    } else {
      signal.addEventListener('abort', abortFromExternal)
    }
  }

  let stallTimer: ReturnType<typeof setTimeout> | null = null
  const armStall = () => {
    if (stallTimer !== null) {
      clearTimeout(stallTimer)
    }
    stallTimer = setTimeout(() => {
      controller.abort(
        new DOMException(`Asset download stalled: ${url}`, 'TimeoutError'),
      )
    }, stallTimeoutMs)
  }
  const clearStall = () => {
    if (stallTimer !== null) {
      clearTimeout(stallTimer)
      stallTimer = null
    }
  }

  try {
    armStall()
    const response = await fetch(url, { signal: controller.signal })
    if (!response.ok) {
      throw new AssetHttpError(url, response.status)
    }

    const totalBytes = Number(response.headers.get('content-length')) || 0

    if (!response.body) {
      // No streaming body available; fall back to a single read.
      const buffer = await response.arrayBuffer()
      onProgress?.({
        receivedBytes: buffer.byteLength,
        totalBytes: totalBytes || buffer.byteLength,
      })
      return buffer
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let receivedBytes = 0

    for (;;) {
      armStall()
      const { done, value } = await reader.read()
      if (done) {
        break
      }
      chunks.push(value)
      receivedBytes += value.length
      onProgress?.({ receivedBytes, totalBytes })
    }

    const merged = new Uint8Array(receivedBytes)
    let offset = 0
    for (const chunk of chunks) {
      merged.set(chunk, offset)
      offset += chunk.length
    }
    return merged.buffer
  } finally {
    clearStall()
    if (signal) {
      signal.removeEventListener('abort', abortFromExternal)
    }
  }
}
