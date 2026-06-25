import { afterEach, describe, expect, it, vi } from 'vitest'
import { dialogActions } from '@/core/stores/dialog-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { resetSceneToDefaults } from '@/core/persistence/scene-reset'
import { toast } from 'sonner'
import { confirmStartOver, startOverIntent } from './start-over-actions'

vi.mock('@/core/persistence/scene-reset', () => ({
  resetSceneToDefaults: vi.fn(),
}))

vi.mock('sonner', () => ({
  toast: { success: vi.fn() },
}))

const STARTED_OVER_MESSAGE = 'Started over. Your changes were cleared.'

describe('start-over-actions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the start-over dialog and clears the status message when it opens', () => {
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(true)
    const clearStatus = vi.spyOn(feedbackActions, 'clearStatusMessage')

    startOverIntent()

    expect(dialogActions.openDialog).toHaveBeenCalledWith('start-over')
    expect(clearStatus).toHaveBeenCalledTimes(1)
  })

  it('leaves the status message untouched when the dialog refuses to open', () => {
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(false)
    const clearStatus = vi.spyOn(feedbackActions, 'clearStatusMessage')

    startOverIntent()

    expect(clearStatus).not.toHaveBeenCalled()
  })

  it('confirms a start-over: closes the dialog, resets, and announces', () => {
    const close = vi.spyOn(dialogActions, 'closeActiveDialog')
    const announce = vi
      .spyOn(feedbackActions, 'announcePolite')
      .mockReturnValue(undefined)

    confirmStartOver()

    expect(close).toHaveBeenCalledTimes(1)
    expect(resetSceneToDefaults).toHaveBeenCalledTimes(1)
    expect(announce).toHaveBeenCalledWith(STARTED_OVER_MESSAGE)
    expect(toast.success).toHaveBeenCalledWith(STARTED_OVER_MESSAGE)
  })
})
