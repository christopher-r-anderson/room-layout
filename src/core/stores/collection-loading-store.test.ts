// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import { AssetHttpError } from '../operations/stream-fetch'
import {
  collectionLoadingActions,
  getCollectionFailureKind,
  isCollectionLoaded,
  resetCollectionLoading,
  useGatedCollectionPaths,
  useGatedCollectionsResolved,
  useGatedLoadProgress,
} from './collection-loading-store'

afterEach(() => {
  resetCollectionLoading()
})

describe('collection-loading-store', () => {
  it('markLoaded clears a prior failure mark', () => {
    collectionLoadingActions.markFailed(
      '/models/a.glb',
      new TypeError('Failed to fetch'),
    )

    collectionLoadingActions.markLoaded('/models/a.glb')

    expect(isCollectionLoaded('/models/a.glb')).toBe(true)
    expect(getCollectionFailureKind('/models/a.glb')).toBeNull()
  })

  it('requestCollection clears a transient failure mark so a retry can proceed', () => {
    collectionLoadingActions.markFailed(
      '/models/a.glb',
      new TypeError('Failed to fetch'),
    )

    collectionLoadingActions.requestCollection('/models/a.glb')

    expect(getCollectionFailureKind('/models/a.glb')).toBeNull()
  })

  it('requestCollection preserves a permanent unavailable mark', () => {
    collectionLoadingActions.markFailed(
      '/models/a.glb',
      new AssetHttpError('/models/a.glb', 404),
    )

    collectionLoadingActions.requestCollection('/models/a.glb')

    expect(getCollectionFailureKind('/models/a.glb')).toBe('unavailable')
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

  it('reports the gated set as unresolved until bootstrap sets it, empty set included', () => {
    expect(renderHook(() => useGatedCollectionsResolved()).result.current).toBe(
      false,
    )
    expect(renderHook(() => useGatedCollectionPaths()).result.current).toEqual(
      [],
    )

    collectionLoadingActions.setGatedCollectionPaths([])

    expect(renderHook(() => useGatedCollectionsResolved()).result.current).toBe(
      true,
    )
  })

  it('counts a parsed collection as byte-complete even without a Content-Length', () => {
    collectionLoadingActions.setGatedCollectionPaths([
      '/models/sized.glb',
      '/models/unsized.glb',
    ])
    collectionLoadingActions.setProgress('/models/sized.glb', {
      receivedBytes: 10,
      totalBytes: 10,
    })
    // No Content-Length: bytes stream with totalBytes 0, then the parse lands.
    collectionLoadingActions.setProgress('/models/unsized.glb', {
      receivedBytes: 7,
      totalBytes: 0,
    })
    collectionLoadingActions.markLoaded('/models/unsized.glb')

    const { result } = renderHook(() => useGatedLoadProgress())

    expect(result.current.total).toBe(2)
    expect(result.current.loadedCount).toBe(2)
    // The unknown-size bytes stay out of the aggregate percent.
    expect(result.current.percent).toBe(100)
  })

  it('reset returns the gated set to unresolved so a retry cannot read a stale gate', () => {
    collectionLoadingActions.setGatedCollectionPaths(['/models/a.glb'])

    resetCollectionLoading()

    expect(renderHook(() => useGatedCollectionsResolved()).result.current).toBe(
      false,
    )
  })

  it('reset clears progress, loaded, wanted, and failed state', () => {
    collectionLoadingActions.markLoaded('/models/a.glb')
    collectionLoadingActions.requestCollection('/models/c.glb')
    collectionLoadingActions.markFailed('/models/c.glb', new Error('offline'))

    resetCollectionLoading()

    expect(getCollectionFailureKind('/models/c.glb')).toBeNull()
  })
})
