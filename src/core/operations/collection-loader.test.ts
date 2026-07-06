import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AssetHttpError } from './stream-fetch'
import {
  collectionLoadingActions,
  getCollectionFailureKind,
  isCollectionLoaded,
  resetCollectionLoadingStore,
  useCollectionLoadingStore,
} from '../stores/collection-loading-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '../stores/editor-lifecycle-store'
import { resetSceneDocumentStore } from '../stores/scene-document-store'
import {
  ensureCollectionLoaded,
  loadCollection,
  resetCollectionPipeline,
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

const {
  clearCollectionBytesMock,
  fetchCollectionBytesMock,
  releaseCollectionBytesMock,
} = vi.hoisted(() => ({
  clearCollectionBytesMock: vi.fn(),
  fetchCollectionBytesMock: vi.fn(() => Promise.resolve(new ArrayBuffer(4))),
  releaseCollectionBytesMock: vi.fn(),
}))

vi.mock('./collection-bytes', () => ({
  clearCollectionBytes: clearCollectionBytesMock,
  fetchCollectionBytes: fetchCollectionBytesMock,
  releaseCollectionBytes: releaseCollectionBytesMock,
}))

const { resetCollectionSceneRegistryMock } = vi.hoisted(() => ({
  resetCollectionSceneRegistryMock: vi.fn(),
}))

vi.mock('@/scene/collection-registry', () => ({
  resetCollectionSceneRegistry: resetCollectionSceneRegistryMock,
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
  resetCollectionLoadingStore()
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

  it('rejects a pending request when the retry teardown resets the store', async () => {
    // The in-flight load never settles the store for its path after a reset
    // (epoch guard), so the waiter must settle off the reset itself.
    const bytes = deferred<ArrayBuffer>()
    fetchCollectionBytesMock.mockReturnValue(bytes.promise)

    const pending = ensureCollectionLoaded('/models/slow.glb')
    resetCollectionLoadingStore()

    await expect(pending).rejects.toThrow(/load was reset/)
  })

  it('rejects a permanently unavailable path without re-downloading it', async () => {
    collectionLoadingActions.markFailed(
      '/models/gone.glb',
      new AssetHttpError('/models/gone.glb', 404),
    )

    await expect(ensureCollectionLoaded('/models/gone.glb')).rejects.toThrow(
      /failed to load/i,
    )
    expect(fetchCollectionBytesMock).not.toHaveBeenCalled()
  })
})

describe('resetCollectionPipeline', () => {
  it('resets the loading store, scene registry, and buffered bytes together, freeing a fresh cycle', async () => {
    collectionLoadingActions.setGatedCollectionPaths(['/models/a.glb'])
    await loadCollection('/models/a.glb')
    expect(isCollectionLoaded('/models/a.glb')).toBe(true)

    resetCollectionPipeline()

    const state = useCollectionLoadingStore.getState()
    expect(state.loaded.size).toBe(0)
    expect(state.gated).toBeNull()
    expect(resetCollectionSceneRegistryMock).toHaveBeenCalledTimes(1)
    expect(clearCollectionBytesMock).toHaveBeenCalledTimes(1)

    await loadCollection('/models/a.glb')
    expect(isCollectionLoaded('/models/a.glb')).toBe(true)
  })
})

describe('startCollectionLoadReconciler', () => {
  it('kicks loads for state that was already in place when it started', async () => {
    // Gate resolved and scene mounted before the reconciler exists - it must
    // reconcile on start, not wait for the next store update.
    editorLifecycleActions.setSceneMounted(true)
    collectionLoadingActions.setGatedCollectionPaths(['/models/pre.glb'])

    const stop = startCollectionLoadReconciler()
    try {
      await vi.waitFor(() => {
        expect(isCollectionLoaded('/models/pre.glb')).toBe(true)
      })
    } finally {
      stop()
    }
  })

  it('loads the gated set once the scene mounts, and newly wanted paths as they arrive', async () => {
    const stop = startCollectionLoadReconciler()
    try {
      collectionLoadingActions.setGatedCollectionPaths(['/models/gated.glb'])
      expect(fetchCollectionBytesMock).not.toHaveBeenCalled()

      editorLifecycleActions.setSceneMounted(true)
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
      editorLifecycleActions.setSceneMounted(true)
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
