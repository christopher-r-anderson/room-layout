// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { EnvironmentMaterialConfig } from '@/domain/environment-materials'
import { useAssetsStore, resetAssetsStore } from '@/core/stores/assets-store'
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
  lightingMoods: [
    {
      id: 'daylight',
      label: 'Daylight',
      exposure: 1.05,
      ambientIntensity: 0.35,
      hemisphereSkyColor: 0xf1f6ff,
      hemisphereGroundColor: 0xaeb9c9,
      hemisphereIntensity: 0.55,
      keyLightColor: 0xfff4e6,
      keyLightIntensity: 1,
      fillLightColor: 0xd5e4ff,
      fillLightIntensity: 0.28,
      environmentColor: 0xdce6f3,
      environmentIntensity: 0.72,
      backgroundIntensity: 0.95,
    },
    {
      id: 'warm-white',
      label: 'Warm White',
      exposure: 0.95,
      ambientIntensity: 0.32,
      hemisphereSkyColor: 0xfff3e2,
      hemisphereGroundColor: 0xc7b29a,
      hemisphereIntensity: 0.5,
      keyLightColor: 0xffe9c7,
      keyLightIntensity: 1,
      fillLightColor: 0xffd9b0,
      fillLightIntensity: 0.26,
      environmentColor: 0xf0e3d2,
      environmentIntensity: 0.7,
      backgroundIntensity: 0.92,
    },
  ],
  defaultFloorFinishId: 'oak',
  defaultWallFinishId: 'plaster',
  defaultLightingMoodId: 'daylight',
}

function seed(
  floorFinishId: string,
  wallFinishId: string,
  lightingMoodId = 'daylight',
) {
  useAssetsStore.setState({ environmentConfig: ENVIRONMENT })
  sceneDocumentStore.setState({ floorFinishId, wallFinishId, lightingMoodId })
}

describe('active-finish-ids', () => {
  // Reset before each test rather than after: resetting while the renderHook
  // component is still mounted re-renders it outside act (cleanup unmounts
  // later), which triggers "not wrapped in act(...)" warnings.
  beforeEach(() => {
    resetAssetsStore()
    resetSceneDocumentStore()
  })

  it('getActiveFinishIds returns the stored ids and options when valid', () => {
    seed('walnut', 'sage', 'warm-white')

    expect(getActiveFinishIds()).toEqual({
      activeFloorFinishId: 'walnut',
      activeWallFinishId: 'sage',
      activeLightingMoodId: 'warm-white',
      selectedFloorOption: ENVIRONMENT.floorFinishes[1],
      selectedWallOption: ENVIRONMENT.wallFinishes[1],
      selectedLightingMoodOption: ENVIRONMENT.lightingMoods[1],
    })
  })

  it('falls back to the config default when a stored id is not in the config', () => {
    seed('unknown', 'sage', 'unknown-mood')

    const result = getActiveFinishIds()

    expect(result.activeFloorFinishId).toBe('oak')
    expect(result.selectedFloorOption).toEqual(ENVIRONMENT.floorFinishes[0])
    expect(result.activeWallFinishId).toBe('sage')
    expect(result.activeLightingMoodId).toBe('daylight')
    expect(result.selectedLightingMoodOption).toEqual(
      ENVIRONMENT.lightingMoods[0],
    )
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
