// @vitest-environment jsdom
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const { useProgressMock } = vi.hoisted(() => ({ useProgressMock: vi.fn() }))

vi.mock('@react-three/drei', () => ({
  useGLTF: Object.assign(vi.fn(), { preload: vi.fn(), clear: vi.fn() }),
  useProgress: useProgressMock,
}))

import { useFurnitureAssetLoadingProgress } from './furniture-collection-cache'

function setProgress(
  overrides: Partial<ReturnType<typeof useProgressMock>> = {},
) {
  useProgressMock.mockReturnValue({
    active: false,
    item: '',
    loaded: 0,
    progress: 0,
    total: 0,
    ...overrides,
  })
}

describe('useFurnitureAssetLoadingProgress', () => {
  it('maps the loading-manager progress to the public progress shape', () => {
    setProgress({
      active: true,
      item: 'leather-collection.glb',
      loaded: 1,
      progress: 50,
      total: 2,
    })

    const { result } = renderHook(() => useFurnitureAssetLoadingProgress())

    expect(result.current).toEqual({
      active: true,
      loaded: 1,
      total: 2,
      percent: 50,
      currentItem: 'leather-collection.glb',
    })
  })

  it('reports 0 percent when the manager has no progress yet (NaN)', () => {
    setProgress({ progress: NaN })

    const { result } = renderHook(() => useFurnitureAssetLoadingProgress())

    expect(result.current.percent).toBe(0)
  })

  it('clamps percent into the 0-100 range', () => {
    setProgress({ progress: 150 })
    expect(
      renderHook(() => useFurnitureAssetLoadingProgress()).result.current
        .percent,
    ).toBe(100)

    setProgress({ progress: -10 })
    expect(
      renderHook(() => useFurnitureAssetLoadingProgress()).result.current
        .percent,
    ).toBe(0)
  })
})
