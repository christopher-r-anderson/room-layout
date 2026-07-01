// @vitest-environment jsdom
import { fireEvent, render, screen } from '@/test/render'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { RoomControls } from '@/features/room-surface/room-controls'
import { assetsActions, resetAssetsStore } from '@/core/stores/assets-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  sceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { createEnvironmentConfig } from './test-fixtures'

beforeEach(() => {
  resetAssetsStore()
  resetSceneDocumentStore()
  assetsActions.setAssets({
    catalog: [],
    collections: [],
    environmentConfig: createEnvironmentConfig(),
  })
  sceneDocumentActions.setFloorFinishId('wood-floor')
  sceneDocumentActions.setWallFinishId('light-gray')
  sceneDocumentActions.setLightingMoodId('daylight')
})

afterEach(() => {
  resetAssetsStore()
  resetSceneDocumentStore()
})

describe('RoomControls', () => {
  it('marks the floor finish control as busy while floor textures are loading', () => {
    sceneDocumentActions.setFloorFinishLoading(true)

    render(<RoomControls />)

    fireEvent.click(screen.getByRole('tab', { name: 'Floor' }))

    expect(screen.getByRole('tabpanel', { name: 'Floor' })).toHaveAttribute(
      'aria-busy',
      'true',
    )
  })

  it('commits floor and wall selections to the scene document', () => {
    render(<RoomControls />)

    fireEvent.click(screen.getByRole('radio', { name: 'Warm White' }))
    fireEvent.click(screen.getByRole('tab', { name: 'Floor' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Concrete' }))

    expect(sceneDocumentStore.getState().wallFinishId).toBe('warm-white')
    expect(sceneDocumentStore.getState().floorFinishId).toBe('concrete-floor')
  })

  it('commits lighting mood selection to the scene document', () => {
    render(<RoomControls />)

    fireEvent.click(screen.getByRole('tab', { name: 'Lighting' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Soft Lamplight' }))

    expect(sceneDocumentStore.getState().lightingMoodId).toBe('soft-lamplight')
  })
})
