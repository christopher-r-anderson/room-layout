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
import { sceneCommands } from '@/core/scene-commands'
import { feedbackActions } from '@/core/stores/feedback-store'
import { toolbarInteractionActions } from '@/core/stores/toolbar-interaction-store'
import { CHAIR } from '@/test/support/furniture'
import {
  moveSelection as moveDocumentSelection,
  rotateSelection as rotateDocumentSelection,
} from './furniture-mutations'
import { moveSelection, rotateSelection } from './movement-actions'

vi.mock('./furniture-mutations', () => ({
  addFurniture: vi.fn(),
  deleteSelection: vi.fn(),
  moveSelection: vi.fn(),
  rotateSelection: vi.fn(),
  setSelectionTransform: vi.fn(),
}))

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

  it('does not invoke document movement mutations while the scene is not ready', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(false)
    vi.mocked(moveDocumentSelection).mockReturnValue({
      ok: true,
      position: [1, 0, 0],
    })

    expect(moveSelection({ x: 1, z: 0 })).toEqual({
      ok: false,
      reason: 'no-selection',
    })
    rotateSelection(1)

    expect(moveDocumentSelection).not.toHaveBeenCalled()
    expect(rotateDocumentSelection).not.toHaveBeenCalled()
  })

  it('forwards enabled move and rotate commands to the document mutations', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(moveDocumentSelection).mockReturnValue({
      ok: true,
      position: [1, 0, 0],
    })

    expect(moveSelection({ x: 1, z: 0 }, { source: 'keyboard' })).toEqual({
      ok: true,
      position: [1, 0, 0],
    })
    rotateSelection(1)

    expect(moveDocumentSelection).toHaveBeenCalledWith(
      { x: 1, z: 0 },
      { source: 'keyboard' },
    )
    expect(rotateDocumentSelection).toHaveBeenCalledWith(Math.PI / 12)
  })

  it('announces the moved item and its new position on success', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    vi.mocked(moveDocumentSelection).mockReturnValue({
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
    vi.mocked(moveDocumentSelection).mockReturnValue({
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
    vi.mocked(moveDocumentSelection).mockReturnValue({
      ok: false,
      reason: 'no-op',
    })

    moveSelection({ x: 1, z: 0 })

    expect(feedbackActions.queueMovementAnnouncement).not.toHaveBeenCalled()
  })

  it('announces a successful rotation', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)

    rotateSelection(1)

    expect(feedbackActions.announcePolite).toHaveBeenCalledWith(
      'Chair rotated.',
    )
  })

  it('arms the toolbar pin grace on a real rotation', () => {
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const reportRotationSpy = vi.spyOn(
      toolbarInteractionActions,
      'reportRotation',
    )

    rotateSelection(1)

    expect(reportRotationSpy).toHaveBeenCalledTimes(1)
  })

  it('does not arm the toolbar pin grace when nothing is selected', () => {
    sceneDocumentActions.setSelectedId(null)
    vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(true)
    const reportRotationSpy = vi.spyOn(
      toolbarInteractionActions,
      'reportRotation',
    )

    rotateSelection(1)

    expect(reportRotationSpy).not.toHaveBeenCalled()
  })
})
