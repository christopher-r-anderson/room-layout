// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { withStartupChunkRetry } from './startup-chunk-retry'

const { notifyChunkLoadErrorMock } = vi.hoisted(() => ({
  notifyChunkLoadErrorMock: vi.fn(),
}))

vi.mock('@/core/operations/startup-coordinator', () => ({
  notifyChunkLoadError: notifyChunkLoadErrorMock,
}))

function stubReload() {
  const reload = vi.fn()
  const original = window.location
  Object.defineProperty(window, 'location', {
    configurable: true,
    value: { reload },
  })
  return {
    reload,
    restore: () => {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: original,
      })
    },
  }
}

afterEach(() => {
  vi.clearAllMocks()
  resetEditorLifecycleStore()
})

describe('withStartupChunkRetry', () => {
  it('passes a successful load through untouched', async () => {
    const factory = withStartupChunkRetry(() =>
      Promise.resolve({ default: 'module' }),
    )

    await expect(factory()).resolves.toEqual({ default: 'module' })
    expect(notifyChunkLoadErrorMock).not.toHaveBeenCalled()
  })

  it('reports a failed load and reloads on the next explicit retry', async () => {
    const location = stubReload()
    try {
      const failure = new Error('Failed to fetch dynamically imported module')
      const factory = withStartupChunkRetry(() => Promise.reject(failure))

      const pending = factory()
      await vi.waitFor(() => {
        expect(notifyChunkLoadErrorMock).toHaveBeenCalledWith(failure)
      })
      expect(location.reload).not.toHaveBeenCalled()

      editorLifecycleActions.requestRetry()
      await vi.waitFor(() => {
        expect(location.reload).toHaveBeenCalledTimes(1)
      })

      // The factory stays pending while the reload tears the page down, so
      // React.lazy never caches a rejection.
      const outcome = await Promise.race([
        pending.then(() => 'settled'),
        new Promise((resolve) => {
          setTimeout(() => {
            resolve('pending')
          }, 20)
        }),
      ])
      expect(outcome).toBe('pending')
    } finally {
      location.restore()
    }
  })
})
