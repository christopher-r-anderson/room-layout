// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import {
  resetSceneSessionStore,
  sceneSessionActions,
  useFloorFinishLoading,
  useIsDragging,
  useSceneSessionStore,
} from './scene-session-store'

beforeEach(() => {
  resetSceneSessionStore()
})

it('tracks the raw previewed id', () => {
  expect(useSceneSessionStore.getState().previewedIdRaw).toBeNull()

  sceneSessionActions.setPreviewedId('item-1')

  expect(useSceneSessionStore.getState().previewedIdRaw).toBe('item-1')

  resetSceneSessionStore()

  expect(useSceneSessionStore.getState().previewedIdRaw).toBeNull()
})

it('tracks the drag flag', () => {
  const { result: isDragging } = renderHook(() => useIsDragging())

  expect(isDragging.current).toBe(false)

  act(() => {
    sceneSessionActions.setDragging(true)
  })

  expect(isDragging.current).toBe(true)

  act(() => {
    resetSceneSessionStore()
  })

  expect(isDragging.current).toBe(false)
})

it('tracks the floor finish loading flag', () => {
  const { result: floorFinishLoading } = renderHook(() =>
    useFloorFinishLoading(),
  )

  expect(floorFinishLoading.current).toBe(false)

  act(() => {
    sceneSessionActions.setFloorFinishLoading(true)
  })

  expect(floorFinishLoading.current).toBe(true)

  act(() => {
    resetSceneSessionStore()
  })

  expect(floorFinishLoading.current).toBe(false)
})
