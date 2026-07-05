import { afterEach, describe, expect, it } from 'vitest'
import { AssetHttpError } from '../operations/stream-fetch'
import {
  collectionLoadingActions,
  ensureCollectionLoaded,
  getCollectionFailureKind,
  resetCollectionLoading,
} from './collection-loading-store'

afterEach(() => {
  resetCollectionLoading()
})

describe('collection-loading-store', () => {
  it('resolves ensureCollectionLoaded immediately for an already-loaded collection', async () => {
    collectionLoadingActions.markLoaded('/models/a.glb')
    await expect(
      ensureCollectionLoaded('/models/a.glb'),
    ).resolves.toBeUndefined()
  })

  it('resolves ensureCollectionLoaded once the loader reports it loaded', async () => {
    let resolved = false
    const pending = ensureCollectionLoaded('/models/b.glb').then(() => {
      resolved = true
    })

    // Still pending until the loader marks it loaded.
    await Promise.resolve()
    expect(resolved).toBe(false)

    collectionLoadingActions.markLoaded('/models/b.glb')
    await pending
    expect(resolved).toBe(true)
  })

  it('rejects ensureCollectionLoaded when the collection is marked failed', async () => {
    const pending = ensureCollectionLoaded('/models/b.glb')

    await Promise.resolve()
    collectionLoadingActions.markFailed('/models/b.glb', new Error('offline'))

    await expect(pending).rejects.toThrow(/failed to load/i)
  })

  it('retries after a failure: re-requesting clears the failure and resolves on load', async () => {
    const firstAttempt = ensureCollectionLoaded('/models/b.glb')
    await Promise.resolve()
    collectionLoadingActions.markFailed('/models/b.glb', new Error('offline'))
    await expect(firstAttempt).rejects.toThrow()

    // A re-add clears the failure and the retry resolves once it loads.
    const retry = ensureCollectionLoaded('/models/b.glb')
    collectionLoadingActions.markLoaded('/models/b.glb')
    await expect(retry).resolves.toBeUndefined()
  })

  it('classifies a non-ok HTTP failure as permanently unavailable', () => {
    collectionLoadingActions.markFailed(
      '/models/c.glb',
      new AssetHttpError('/models/c.glb', 404),
    )
    expect(getCollectionFailureKind('/models/c.glb')).toBe('unavailable')
  })

  it('classifies a network/stall failure as a transient connection problem', () => {
    // fetch rejects with a TypeError on a network error, and with a DOMException
    // (AbortError / TimeoutError) on an abort or stall.
    collectionLoadingActions.markFailed(
      '/models/c.glb',
      new TypeError('Failed to fetch'),
    )
    expect(getCollectionFailureKind('/models/c.glb')).toBe('connection')

    collectionLoadingActions.markFailed(
      '/models/d.glb',
      new DOMException('Asset download stalled', 'TimeoutError'),
    )
    expect(getCollectionFailureKind('/models/d.glb')).toBe('connection')
  })

  it('classifies a post-download failure (e.g. GLB parse) as permanently unavailable', () => {
    collectionLoadingActions.markFailed(
      '/models/c.glb',
      new Error('Invalid glTF chunk'),
    )
    expect(getCollectionFailureKind('/models/c.glb')).toBe('unavailable')
  })

  it('reset clears progress, loaded, wanted, and failed state', () => {
    collectionLoadingActions.markLoaded('/models/a.glb')
    collectionLoadingActions.requestCollection('/models/c.glb')
    collectionLoadingActions.markFailed('/models/c.glb', new Error('offline'))

    resetCollectionLoading()

    expect(getCollectionFailureKind('/models/c.glb')).toBeNull()
  })
})
