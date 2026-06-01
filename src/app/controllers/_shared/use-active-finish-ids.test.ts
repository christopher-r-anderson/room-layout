// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { EnvironmentMaterialConfig } from '@/lib/three/environment-materials'
import { useActiveFinishIds } from './use-active-finish-ids'

const ENVIRONMENT: EnvironmentMaterialConfig = {
  floorFinishes: [
    {
      id: 'oak',
      label: 'Oak',
      diffusePath: '/floor/oak.ktx2',
      normalPath: '/floor/oak-normal.ktx2',
      tileSizeMeters: { width: 1, depth: 1 },
    },
    {
      id: 'walnut',
      label: 'Walnut',
      diffusePath: '/floor/walnut.ktx2',
      normalPath: '/floor/walnut-normal.ktx2',
      tileSizeMeters: { width: 1, depth: 1 },
    },
  ],
  wallFinishes: [
    { id: 'plaster', label: 'Plaster', color: 0xeeeeee },
    { id: 'sage', label: 'Sage', color: 0x8a9a82 },
  ],
  defaultFloorFinishId: 'oak',
  defaultWallFinishId: 'plaster',
}

describe('useActiveFinishIds', () => {
  it('returns the supplied ids when they exist in the config', () => {
    const { result } = renderHook(() =>
      useActiveFinishIds({
        environmentConfig: ENVIRONMENT,
        floorFinishId: 'walnut',
        wallFinishId: 'sage',
      }),
    )

    expect(result.current.activeFloorFinishId).toBe('walnut')
    expect(result.current.activeWallFinishId).toBe('sage')
    expect(result.current.selectedFloorOption?.id).toBe('walnut')
    expect(result.current.selectedWallOption?.id).toBe('sage')
  })

  it('falls back to the configured defaults for unknown ids', () => {
    const { result } = renderHook(() =>
      useActiveFinishIds({
        environmentConfig: ENVIRONMENT,
        floorFinishId: 'unknown-floor',
        wallFinishId: 'unknown-wall',
      }),
    )

    expect(result.current.activeFloorFinishId).toBe('oak')
    expect(result.current.activeWallFinishId).toBe('plaster')
    expect(result.current.selectedFloorOption?.id).toBe('oak')
    expect(result.current.selectedWallOption?.id).toBe('plaster')
  })

  it('returns empty ids and null options when the config is null', () => {
    const { result } = renderHook(() =>
      useActiveFinishIds({
        environmentConfig: null,
        floorFinishId: 'oak',
        wallFinishId: 'sage',
      }),
    )

    expect(result.current.activeFloorFinishId).toBe('')
    expect(result.current.activeWallFinishId).toBe('')
    expect(result.current.selectedFloorOption).toBeNull()
    expect(result.current.selectedWallOption).toBeNull()
  })

  it('preserves option identity across renders when ids do not change', () => {
    const { result, rerender } = renderHook(
      (props: { floorId: string; wallId: string }) =>
        useActiveFinishIds({
          environmentConfig: ENVIRONMENT,
          floorFinishId: props.floorId,
          wallFinishId: props.wallId,
        }),
      { initialProps: { floorId: 'oak', wallId: 'plaster' } },
    )

    const firstFloor = result.current.selectedFloorOption
    const firstWall = result.current.selectedWallOption

    rerender({ floorId: 'oak', wallId: 'plaster' })

    expect(result.current.selectedFloorOption).toBe(firstFloor)
    expect(result.current.selectedWallOption).toBe(firstWall)
  })
})
