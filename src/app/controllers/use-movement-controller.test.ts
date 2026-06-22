// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneStateStore,
  sceneStateActions,
} from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { useMovementController } from './use-movement-controller'

vi.mock('@/editor-state/announcement-store', () => ({
  announcementActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
  },
}))

const CHAIR: FurnitureItem = {
  id: 'chair-1',
  catalogId: 'chair',
  collectionId: 'collection-1',
  footprintSize: { width: 1, depth: 1 },
  kind: 'armchair',
  name: 'Chair',
  nodeName: 'ChairNode',
  position: [0, 0, 0],
  rotationY: 0,
  sourcePath: '/models/chair.glb',
}

describe('useMovementController', () => {
  beforeEach(() => {
    resetSceneStateStore()
    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    sceneStateActions.setSelectedId(CHAIR.id)
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('does not invoke scene movement commands while interactions are disabled', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const moveSelection = vi
      .spyOn(sceneCommands, 'moveSelection')
      .mockReturnValue({ ok: true, position: [1, 0, 0] })
    const rotateSelection = vi
      .spyOn(sceneCommands, 'rotateSelection')
      .mockImplementation(() => undefined)
    const setSelectionTransform = vi
      .spyOn(sceneCommands, 'setSelectionTransform')
      .mockReturnValue({ ok: true, item: CHAIR })

    const { result } = renderHook(() =>
      useMovementController({
        editorInteractionsEnabled: false,
        rotationStepRadians: Math.PI / 12,
      }),
    )

    expect(result.current.handleMoveSelection({ x: 1, z: 0 })).toEqual({
      ok: false,
      reason: 'no-selection',
    })
    result.current.handleRotateSelection(1)
    expect(
      result.current.handleUpdateSelectedItemDetails({
        field: 'positionX',
        fieldLabel: 'Left clearance',
        value: 1,
      }),
    ).toEqual({
      ok: false,
      reason: 'no-selection',
      message: 'Select a furniture item first.',
    })

    expect(moveSelection).not.toHaveBeenCalled()
    expect(rotateSelection).not.toHaveBeenCalled()
    expect(setSelectionTransform).not.toHaveBeenCalled()
  })

  it('forwards enabled move and rotate commands to the scene', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const moveSelection = vi
      .spyOn(sceneCommands, 'moveSelection')
      .mockReturnValue({ ok: true, position: [1, 0, 0] })
    const rotateSelection = vi
      .spyOn(sceneCommands, 'rotateSelection')
      .mockImplementation(() => undefined)

    const { result } = renderHook(() =>
      useMovementController({
        editorInteractionsEnabled: true,
        rotationStepRadians: Math.PI / 12,
      }),
    )

    expect(
      result.current.handleMoveSelection(
        { x: 1, z: 0 },
        { source: 'keyboard' },
      ),
    ).toEqual({
      ok: true,
      position: [1, 0, 0],
    })
    act(() => {
      result.current.handleRotateSelection(1)
    })

    expect(moveSelection).toHaveBeenCalledWith(
      { x: 1, z: 0 },
      { source: 'keyboard' },
    )
    expect(rotateSelection).toHaveBeenCalledWith(Math.PI / 12)
  })
})
