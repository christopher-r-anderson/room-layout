// @vitest-environment jsdom
import { fireEvent, render, screen } from '@/test/render'
import { beforeEach, describe, expect, it } from 'vitest'
import { RoomControls } from '@/features/room-surface/room-controls'
import { assetsActions, resetAssetsStore } from '@/core/stores/assets-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import {
  resetSceneSessionStore,
  sceneSessionActions,
} from '@/core/stores/scene-session-store'
import { createEnvironmentConfig } from './test-fixtures'

beforeEach(() => {
  resetAssetsStore()
  resetSceneDocumentStore()
  resetSceneSessionStore()
  assetsActions.setAssets({
    catalog: [],
    collections: [],
    environmentConfig: createEnvironmentConfig(),
  })
  sceneDocumentActions.setFloorFinishId('wood-floor')
  sceneDocumentActions.setWallFinishId('light-gray')
  sceneDocumentActions.setLightingMoodId('daylight')
})

describe('RoomControls', () => {
  it('marks the floor finish control as busy while floor textures are loading', () => {
    sceneSessionActions.setFloorFinishLoading(true)

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

    expect(useSceneDocumentStore.getState().wallFinishId).toBe('warm-white')
    expect(useSceneDocumentStore.getState().floorFinishId).toBe(
      'concrete-floor',
    )
  })

  it('commits lighting mood selection to the scene document', () => {
    render(<RoomControls />)

    fireEvent.click(screen.getByRole('tab', { name: 'Lighting' }))
    fireEvent.click(screen.getByRole('radio', { name: 'Soft Lamplight' }))

    expect(useSceneDocumentStore.getState().lightingMoodId).toBe(
      'soft-lamplight',
    )
  })

  it('commits a room size from the Size tab to the scene document', () => {
    render(<RoomControls />)

    fireEvent.click(screen.getByRole('tab', { name: 'Size' }))
    const depthInput = screen.getByLabelText('Depth (m)')
    fireEvent.change(depthInput, { target: { value: '10' } })
    fireEvent.keyDown(depthInput, { key: 'Enter' })

    expect(useSceneDocumentStore.getState().roomSize.depth).toBe(10)
  })
})
