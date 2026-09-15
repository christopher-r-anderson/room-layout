// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'
import { makeFurnitureItem } from '@/test/support/furniture'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useFloorFinishId,
  useItems,
  useLightingMoodId,
  useWallFinishId,
} from './scene-document-store'

const FURNITURE_ITEM = makeFurnitureItem({ id: 'item-1', catalogId: 'chair-1' })

beforeEach(() => {
  resetSceneDocumentStore()
})

function seedSceneItems(items: FurnitureItem[]) {
  sceneDocumentActions.setHistory(createHistoryState(items))
}

describe('useSceneDocumentStore', () => {
  it('derives the item list from the history present', () => {
    const { result: items } = renderHook(() => useItems())

    expect(items.current).toEqual([])

    act(() => {
      seedSceneItems([FURNITURE_ITEM])
    })

    expect(items.current).toEqual([FURNITURE_ITEM])
  })

  it('tracks finish ids and the lighting mood', () => {
    const { result: floorFinishId } = renderHook(() => useFloorFinishId())
    const { result: wallFinishId } = renderHook(() => useWallFinishId())
    const { result: lightingMoodId } = renderHook(() => useLightingMoodId())

    act(() => {
      sceneDocumentActions.setFloorFinishId('oak-floor')
      sceneDocumentActions.setWallFinishId('white-wall')
      sceneDocumentActions.setLightingMoodId('warm-white')
    })

    expect(floorFinishId.current).toBe('oak-floor')
    expect(wallFinishId.current).toBe('white-wall')
    expect(lightingMoodId.current).toBe('warm-white')

    act(() => {
      resetSceneDocumentStore()
    })

    expect(lightingMoodId.current).toBe('')
  })
})
