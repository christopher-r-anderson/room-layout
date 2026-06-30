// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { sceneCommands } from '@/scene/scene-commands'
import { feedbackActions } from '@/core/stores/feedback-store'
import { CHAIR } from '@/test/support/furniture'
import { moveSelection, rotateSelection } from './movement-actions'

vi.mock('@/core/stores/feedback-store', () => ({
  feedbackActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
    setStatusMessage: vi.fn(),
    clearStatusMessage: vi.fn(),
  },
}))

describe('movement-actions', () => {
  beforeEach(() => {
    resetSceneDocumentStore()
    resetEditorLifecycleStore()
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    sceneDocumentActions.setSelectedId(CHAIR.id)
    editorLifecycleActions.markAssetsReady()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('does not invoke scene movement commands while the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    const moveSelectionSpy = vi
      .spyOn(sceneCommands, 'moveSelection')
      .mockReturnValue({ ok: true, position: [1, 0, 0] })
    const rotateSelectionSpy = vi
      .spyOn(sceneCommands, 'rotateSelection')
      .mockImplementation(() => undefined)

    expect(moveSelection({ x: 1, z: 0 })).toEqual({
      ok: false,
      reason: 'no-selection',
    })
    rotateSelection(1)

    expect(moveSelectionSpy).not.toHaveBeenCalled()
    expect(rotateSelectionSpy).not.toHaveBeenCalled()
  })

  it('forwards enabled move and rotate commands to the scene', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const moveSelectionSpy = vi
      .spyOn(sceneCommands, 'moveSelection')
      .mockReturnValue({ ok: true, position: [1, 0, 0] })
    const rotateSelectionSpy = vi
      .spyOn(sceneCommands, 'rotateSelection')
      .mockImplementation(() => undefined)

    expect(moveSelection({ x: 1, z: 0 }, { source: 'keyboard' })).toEqual({
      ok: true,
      position: [1, 0, 0],
    })
    rotateSelection(1)

    expect(moveSelectionSpy).toHaveBeenCalledWith(
      { x: 1, z: 0 },
      { source: 'keyboard' },
    )
    expect(rotateSelectionSpy).toHaveBeenCalledWith(Math.PI / 12)
  })

  it('announces the moved item and its new position on success', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'moveSelection').mockReturnValue({
      ok: true,
      position: [1.2, 0, -3.4],
    })

    moveSelection({ x: 1, z: 0 })

    expect(feedbackActions.queueMovementAnnouncement).toHaveBeenCalledWith(
      'Chair moved to X 1.2 meters and Z -3.4 meters.',
    )
  })

  it('announces the reason when a move is blocked', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'moveSelection').mockReturnValue({
      ok: false,
      reason: 'blocked-bounds',
    })

    moveSelection({ x: 1, z: 0 })

    expect(feedbackActions.queueMovementAnnouncement).toHaveBeenCalledWith(
      'Movement blocked by room bounds.',
    )
  })

  it('stays silent on a no-op move', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'moveSelection').mockReturnValue({
      ok: false,
      reason: 'no-op',
    })

    moveSelection({ x: 1, z: 0 })

    expect(feedbackActions.queueMovementAnnouncement).not.toHaveBeenCalled()
  })

  it('announces a successful rotation', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.spyOn(sceneCommands, 'rotateSelection').mockImplementation(
      () => undefined,
    )

    rotateSelection(1)

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Chair rotated.',
    )
  })
})
