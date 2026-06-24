// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import { assetsStore, resetAssetsStore } from '@/core/stores/assets-store'
import {
  resetSceneDocumentStore,
  sceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { getActiveFinishIds, useActiveFinishIds } from './active-finish-ids'

const ENVIRONMENT: EnvironmentMaterialConfig = {
  floorFinishes: [
    {
      id: 'oak',
      label: 'Oak',
      diffusePath: '/oak.ktx2',
      normalPath: '/oak-n.ktx2',
      tileSizeMeters: { width: 1, depth: 1 },
    },
    {
      id: 'walnut',
      label: 'Walnut',
      diffusePath: '/walnut.ktx2',
      normalPath: '/walnut-n.ktx2',
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

function seed(floorFinishId: string, wallFinishId: string) {
  assetsStore.setState({ environmentConfig: ENVIRONMENT })
  sceneDocumentStore.setState({ floorFinishId, wallFinishId })
}

describe('active-finish-ids', () => {
  afterEach(() => {
    resetAssetsStore()
    resetSceneDocumentStore()
  })

  it('getActiveFinishIds returns the stored ids and options when valid', () => {
    seed('walnut', 'sage')

    expect(getActiveFinishIds()).toEqual({
      activeFloorFinishId: 'walnut',
      activeWallFinishId: 'sage',
      selectedFloorOption: ENVIRONMENT.floorFinishes[1],
      selectedWallOption: ENVIRONMENT.wallFinishes[1],
    })
  })

  it('falls back to the config default when a stored id is not in the config', () => {
    seed('unknown', 'sage')

    const result = getActiveFinishIds()

    expect(result.activeFloorFinishId).toBe('oak')
    expect(result.selectedFloorOption).toEqual(ENVIRONMENT.floorFinishes[0])
    expect(result.activeWallFinishId).toBe('sage')
  })

  it('useActiveFinishIds derives the same result from the stores', () => {
    seed('walnut', 'plaster')

    const { result } = renderHook(() => useActiveFinishIds())

    expect(result.current.activeFloorFinishId).toBe('walnut')
    expect(result.current.selectedWallOption).toEqual(
      ENVIRONMENT.wallFinishes[0],
    )
  })
})
