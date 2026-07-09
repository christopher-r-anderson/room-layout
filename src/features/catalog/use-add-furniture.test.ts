// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook, waitFor } from '@testing-library/react'
import { useAddFurniture } from './use-add-furniture'

const { addFurnitureMock, setCatalogDrawerOpenMock } = vi.hoisted(() => ({
  addFurnitureMock: vi.fn<() => Promise<boolean>>(),
  setCatalogDrawerOpenMock: vi.fn<(open: boolean) => void>(),
}))

vi.mock('./catalog-actions', () => ({
  addFurniture: addFurnitureMock,
  prefetchCatalogItem: vi.fn(),
  setCatalogDrawerOpen: setCatalogDrawerOpenMock,
}))

vi.mock('@/core/stores/collection-loading-store', () => ({
  useCollectionLoadPercent: () => null,
}))

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => {
    resolve = res
  })
  return { promise, resolve }
}

afterEach(() => {
  vi.clearAllMocks()
  vi.useRealTimers()
})

describe('useAddFurniture', () => {
  it('disables immediately but does not flash pending for a fast add', async () => {
    const pending = deferred<boolean>()
    addFurnitureMock.mockReturnValueOnce(pending.promise)

    const { result } = renderHook(() =>
      useAddFurniture({
        catalogIdToAdd: 'chair',
        selectedSourcePath: null,
        open: true,
      }),
    )

    act(() => {
      result.current.submit()
    })
    expect(result.current.isSubmitting).toBe(true)
    expect(result.current.showPending).toBe(false)

    // Resolves well before the pending delay; pending never shows.
    pending.resolve(true)
    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false)
    })
    expect(result.current.showPending).toBe(false)
    expect(setCatalogDrawerOpenMock).toHaveBeenCalledWith(false)
  })

  it('runs onAdded before closing the drawer on a successful add', async () => {
    const pending = deferred<boolean>()
    addFurnitureMock.mockReturnValueOnce(pending.promise)
    const onAdded = vi.fn()

    const { result } = renderHook(() =>
      useAddFurniture({
        catalogIdToAdd: 'chair',
        selectedSourcePath: null,
        open: true,
        onAdded,
      }),
    )

    act(() => {
      result.current.submit()
    })
    pending.resolve(true)

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false)
    })
    expect(onAdded).toHaveBeenCalledOnce()
    expect(setCatalogDrawerOpenMock).toHaveBeenCalledWith(false)
    // onAdded must run before the close so the drawer captures its focus intent
    // before the close-auto-focus fires.
    expect(onAdded.mock.invocationCallOrder[0]).toBeLessThan(
      setCatalogDrawerOpenMock.mock.invocationCallOrder[0],
    )
  })

  it('does not run onAdded when the add does not succeed', async () => {
    const pending = deferred<boolean>()
    addFurnitureMock.mockReturnValueOnce(pending.promise)
    const onAdded = vi.fn()

    const { result } = renderHook(() =>
      useAddFurniture({
        catalogIdToAdd: 'chair',
        selectedSourcePath: null,
        open: true,
        onAdded,
      }),
    )

    act(() => {
      result.current.submit()
    })
    pending.resolve(false)

    await waitFor(() => {
      expect(result.current.isSubmitting).toBe(false)
    })
    expect(onAdded).not.toHaveBeenCalled()
    expect(setCatalogDrawerOpenMock).not.toHaveBeenCalled()
  })

  it('shows pending once the delay elapses for a slow add', () => {
    vi.useFakeTimers()
    addFurnitureMock.mockReturnValueOnce(deferred<boolean>().promise)

    const { result } = renderHook(() =>
      useAddFurniture({
        catalogIdToAdd: 'chair',
        selectedSourcePath: null,
        open: true,
      }),
    )

    act(() => {
      result.current.submit()
    })
    expect(result.current.showPending).toBe(false)

    act(() => {
      vi.advanceTimersByTime(300)
    })
    expect(result.current.showPending).toBe(true)
  })
})
