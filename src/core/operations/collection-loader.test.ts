import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  collectionLoadingActions,
  getCollectionFailureKind,
  isCollectionLoaded,
  resetCollectionLoading,
} from '../stores/collection-loading-store'
import {
  editorLifecycleActions,
  editorLifecycleStore,
  resetEditorLifecycleStore,
} from '../stores/editor-lifecycle-store'
import { resetSceneDocumentStore } from '../stores/scene-document-store'
import {
  ensureCollectionLoaded,
  loadCollection,
  startCollectionLoadReconciler,
} from './collection-loader'

const { sceneCommandsMock } = vi.hoisted(() => ({
  sceneCommandsMock: {
    isSceneReady: vi.fn(() => true),
    loadCollectionScene: vi.fn(() => Promise.resolve()),
  },
}))

vi.mock('@/scene/scene-commands', () => ({
  sceneCommands: sceneCommandsMock,
}))

const { fetchCollectionBytesMock, releaseCollectionBytesMock } = vi.hoisted(
  () => ({
    fetchCollectionBytesMock: vi.fn(() => Promise.resolve(new ArrayBuffer(4))),
    releaseCollectionBytesMock: vi.fn(),
  }),
)

vi.mock('./collection-bytes', () => ({
  fetchCollectionBytes: fetchCollectionBytesMock,
  releaseCollectionBytes: releaseCollectionBytesMock,
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

beforeEach(() => {
  sceneCommandsMock.isSceneReady.mockReturnValue(true)
  sceneCommandsMock.loadCollectionScene.mockResolvedValue(undefined)
  fetchCollectionBytesMock.mockResolvedValue(new ArrayBuffer(4))
})

afterEach(() => {
  vi.clearAllMocks()
  resetCollectionLoading()
  resetEditorLifecycleStore()
  resetSceneDocumentStore()
  vi.restoreAllMocks()
})

describe('loadCollection', () => {
  it('fetches, parses through the scene service, then marks loaded and releases the bytes', async () => {
    // The registry entry must exist before the loaded flag: consumers read the
    // registry on the strength of the core flag.
    sceneCommandsMock.loadCollectionScene.mockImplementation(() => {
      expect(isCollectionLoaded('/models/a.glb')).toBe(false)
      return Promise.resolve()
    })

    await loadCollection('/models/a.glb')

    expect(sceneCommandsMock.loadCollectionScene).toHaveBeenCalledWith(
      '/models/a.glb',
      expect.any(ArrayBuffer),
    )
    expect(isCollectionLoaded('/models/a.glb')).toBe(true)
    expect(releaseCollectionBytesMock).toHaveBeenCalledWith('/models/a.glb')
  })

  it('marks a failure with its classification', async () => {
    fetchCollectionBytesMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await loadCollection('/models/a.glb')

    expect(getCollectionFailureKind('/models/a.glb')).toBe('connection')
    expect(isCollectionLoaded('/models/a.glb')).toBe(false)
  })

  it('does nothing while the scene is not ready', async () => {
    sceneCommandsMock.isSceneReady.mockReturnValue(false)

    await loadCollection('/models/a.glb')

    expect(fetchCollectionBytesMock).not.toHaveBeenCalled()
  })

  it('dedupes concurrent loads of the same path', async () => {
    const bytes = deferred<ArrayBuffer>()
    fetchCollectionBytesMock.mockReturnValue(bytes.promise)

    const first = loadCollection('/models/a.glb')
    const second = loadCollection('/models/a.glb')
    bytes.resolve(new ArrayBuffer(4))
    await Promise.all([first, second])

    expect(fetchCollectionBytesMock).toHaveBeenCalledTimes(1)
    expect(sceneCommandsMock.loadCollectionScene).toHaveBeenCalledTimes(1)
  })

  it('discards a result from a stale epoch instead of writing into the fresh cycle', async () => {
    const bytes = deferred<ArrayBuffer>()
    fetchCollectionBytesMock.mockReturnValue(bytes.promise)

    const pending = loadCollection('/models/a.glb')
    // The retry teardown bumps the epoch while the bytes are still streaming.
    editorLifecycleActions.beginAssetLoad()
    bytes.resolve(new ArrayBuffer(4))
    await pending

    expect(sceneCommandsMock.loadCollectionScene).not.toHaveBeenCalled()
    expect(isCollectionLoaded('/models/a.glb')).toBe(false)
    // The fresh cycle is free to reload the path.
    await loadCollection('/models/a.glb')
    expect(isCollectionLoaded('/models/a.glb')).toBe(true)
  })
})

describe('ensureCollectionLoaded', () => {
  it('resolves immediately for an already-loaded collection', async () => {
    collectionLoadingActions.markLoaded('/models/a.glb')
    await expect(
      ensureCollectionLoaded('/models/a.glb'),
    ).resolves.toBeUndefined()
  })

  it('kicks the load directly and resolves once it completes', async () => {
    await expect(
      ensureCollectionLoaded('/models/b.glb'),
    ).resolves.toBeUndefined()
    expect(isCollectionLoaded('/models/b.glb')).toBe(true)
  })

  it('rejects when the load fails', async () => {
    fetchCollectionBytesMock.mockRejectedValue(new TypeError('Failed to fetch'))

    await expect(ensureCollectionLoaded('/models/b.glb')).rejects.toThrow(
      /failed to load/i,
    )
  })

  it('retries after a transient failure: a re-request clears the mark and loads', async () => {
    fetchCollectionBytesMock.mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    )
    await expect(ensureCollectionLoaded('/models/b.glb')).rejects.toThrow()

    await expect(
      ensureCollectionLoaded('/models/b.glb'),
    ).resolves.toBeUndefined()
    expect(isCollectionLoaded('/models/b.glb')).toBe(true)
  })
})

describe('startCollectionLoadReconciler', () => {
  it('loads the gated set once the scene mounts, and newly wanted paths as they arrive', async () => {
    const stop = startCollectionLoadReconciler()
    try {
      collectionLoadingActions.setGatedCollectionPaths(['/models/gated.glb'])
      expect(fetchCollectionBytesMock).not.toHaveBeenCalled()

      editorLifecycleStore.getState().setSceneMounted(true)
      await vi.waitFor(() => {
        expect(isCollectionLoaded('/models/gated.glb')).toBe(true)
      })

      collectionLoadingActions.requestCollection('/models/wanted.glb')
      await vi.waitFor(() => {
        expect(isCollectionLoaded('/models/wanted.glb')).toBe(true)
      })
    } finally {
      stop()
    }
  })

  it('does not reattempt a failed collection until it is re-requested', async () => {
    fetchCollectionBytesMock.mockRejectedValueOnce(
      new TypeError('Failed to fetch'),
    )
    const stop = startCollectionLoadReconciler()
    try {
      editorLifecycleStore.getState().setSceneMounted(true)
      collectionLoadingActions.requestCollection('/models/flaky.glb')
      await vi.waitFor(() => {
        expect(getCollectionFailureKind('/models/flaky.glb')).toBe('connection')
      })
      expect(fetchCollectionBytesMock).toHaveBeenCalledTimes(1)

      collectionLoadingActions.requestCollection('/models/flaky.glb')
      await vi.waitFor(() => {
        expect(isCollectionLoaded('/models/flaky.glb')).toBe(true)
      })
      expect(fetchCollectionBytesMock).toHaveBeenCalledTimes(2)
    } finally {
      stop()
    }
  })
})
