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

  it('does not invoke scene movement commands while interactions are disabled', () => {
    resetEditorLifecycleStore()
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
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
})
