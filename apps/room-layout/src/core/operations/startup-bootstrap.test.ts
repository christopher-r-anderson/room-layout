// @vitest-environment jsdom

import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
  useEditorLifecycleStore,
} from '../stores/editor-lifecycle-store'
import { resetAssetsStore, useAssetsStore } from '../stores/assets-store'
import {
  resetCollectionLoadingStore,
  useCollectionLoadingStore,
} from '../stores/collection-loading-store'
import {
  fetchCatalogManifest,
  ManifestNetworkError,
  ManifestValidationError,
  type CatalogManifestResult,
} from './catalog-manifest'
import { resolveReferencedCollectionPaths } from './referenced-collections'
import { warmCollectionBytes } from './collection-bytes'
import {
  cancelStartupBootstrap,
  runStartupBootstrap,
} from './startup-bootstrap'

vi.mock('./catalog-manifest', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./catalog-manifest')>()),
  fetchCatalogManifest: vi.fn(),
}))

vi.mock('./referenced-collections', () => ({
  resolveReferencedCollectionPaths: vi.fn(() => ['/models/gated.glb']),
}))

vi.mock('./collection-bytes', () => ({
  warmCollectionBytes: vi.fn(),
}))

vi.mock('../persistence/scene-draft', () => ({
  loadSceneDraft: vi.fn().mockReturnValue(null),
}))

const fetchCatalogManifestMock = vi.mocked(fetchCatalogManifest)

const manifestResult: CatalogManifestResult = {
  catalog: [],
  collections: [],
  environment: {} as EnvironmentMaterialConfig,
}

// A fetch that never settles on its own but honors its abort signal, so tests
// control settlement through cancel/supersede/timeout exactly like a real fetch.
function pendingAbortableFetch() {
  fetchCatalogManifestMock.mockImplementation(
    (_path, options) =>
      new Promise((_resolve, reject) => {
        options?.signal?.addEventListener('abort', () => {
          reject(new DOMException('aborted', 'AbortError'))
        })
      }),
  )
}

async function flushMicrotasks() {
  await Promise.resolve()
  await Promise.resolve()
}

beforeEach(() => {
  resetEditorLifecycleStore()
  resetAssetsStore()
  resetCollectionLoadingStore()
})

afterEach(() => {
  cancelStartupBootstrap()
  vi.clearAllMocks()
  vi.useRealTimers()
})

it('loads the manifest into the assets store, resolves the gate, and begins the load', async () => {
  fetchCatalogManifestMock.mockResolvedValue(manifestResult)
  // Park the phase off 'loading' so beginAssetLoad's flip is observable.
  editorLifecycleActions.markAssetsReady()

  runStartupBootstrap()
  await flushMicrotasks()

  expect(useAssetsStore.getState().catalog).toBe(manifestResult.catalog)
  expect(useAssetsStore.getState().environmentConfig).toBe(
    manifestResult.environment,
  )
  expect(resolveReferencedCollectionPaths).toHaveBeenCalledTimes(1)
  expect(useCollectionLoadingStore.getState().gated).toEqual([
    '/models/gated.glb',
  ])
  expect(useEditorLifecycleStore.getState().startupPhase).toBe('loading')
  // The manifest arriving never starts a new cycle; only an explicit retry does.
  expect(useEditorLifecycleStore.getState().startupCycle).toBe(0)
  expect(warmCollectionBytes).toHaveBeenCalledWith(['/models/gated.glb'])
})

it('classifies a network failure as manifest-network', async () => {
  fetchCatalogManifestMock.mockRejectedValue(
    new ManifestNetworkError('offline'),
  )

  runStartupBootstrap()
  await flushMicrotasks()

  const state = useEditorLifecycleStore.getState()
  expect(state.startupPhase).toBe('errored')
  expect(state.assetError?.kind).toBe('manifest-network')
})

it('classifies invalid manifest data as manifest-validation', async () => {
  fetchCatalogManifestMock.mockRejectedValue(
    new ManifestValidationError('bad manifest'),
  )

  runStartupBootstrap()
  await flushMicrotasks()

  expect(useEditorLifecycleStore.getState().assetError?.kind).toBe(
    'manifest-validation',
  )
})

it('classifies the stalled-fetch abort as manifest-timeout', async () => {
  vi.useFakeTimers()
  pendingAbortableFetch()

  runStartupBootstrap()
  await vi.advanceTimersByTimeAsync(15001)

  expect(useEditorLifecycleStore.getState().assetError?.kind).toBe(
    'manifest-timeout',
  )
})

it('a superseded run writes nothing; the latest run wins', async () => {
  pendingAbortableFetch()
  runStartupBootstrap()

  fetchCatalogManifestMock.mockResolvedValue(manifestResult)
  runStartupBootstrap()
  await flushMicrotasks()

  // The first run's abort rejection must not surface as an error, and the
  // second run's success lands exactly once.
  expect(useEditorLifecycleStore.getState().assetError).toBeNull()
  expect(useEditorLifecycleStore.getState().startupPhase).toBe('loading')
  expect(useCollectionLoadingStore.getState().gated).toEqual([
    '/models/gated.glb',
  ])
  expect(fetchCatalogManifestMock).toHaveBeenCalledTimes(2)
})

it('cancelStartupBootstrap aborts the run without recording an outcome', async () => {
  pendingAbortableFetch()
  runStartupBootstrap()

  cancelStartupBootstrap()
  await flushMicrotasks()

  const state = useEditorLifecycleStore.getState()
  expect(state.assetError).toBeNull()
  expect(state.startupPhase).toBe('loading')
  expect(useCollectionLoadingStore.getState().gated).toBeNull()
  expect(useAssetsStore.getState().catalog).toEqual([])
})

it('a late success from an aborted run does not write into the fresh cycle', async () => {
  let resolveFirst: (result: CatalogManifestResult) => void = () => undefined
  fetchCatalogManifestMock.mockImplementation(
    () =>
      new Promise((resolve) => {
        resolveFirst = resolve
      }),
  )
  runStartupBootstrap()

  cancelStartupBootstrap()
  // The fetch itself ignores the abort and still resolves - the run must
  // notice its signal was aborted and discard the result.
  resolveFirst(manifestResult)
  await flushMicrotasks()

  expect(useAssetsStore.getState().catalog).toEqual([])
  expect(useCollectionLoadingStore.getState().gated).toBeNull()
})
