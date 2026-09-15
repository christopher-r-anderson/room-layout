import {
  appToastManager,
  feedbackStoreForTests,
} from '@/core/stores/feedback-store'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { dialogActions } from '@/core/stores/dialog-store'
import { resetSceneToDefaults } from '@/core/operations/scene-reset'
import { confirmStartOver, startOverIntent } from './start-over-actions'

vi.mock('@/core/operations/scene-reset', () => ({
  resetSceneToDefaults: vi.fn(),
}))

const STARTED_OVER_MESSAGE = 'Started over. Your changes were cleared.'

describe('start-over-actions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('opens the start-over dialog', () => {
    vi.spyOn(dialogActions, 'openDialog').mockReturnValue(true)

    startOverIntent()

    expect(dialogActions.openDialog).toHaveBeenCalledWith('start-over')
  })

  it('confirms a start-over: closes the dialog, resets, and raises the success toast', () => {
    const close = vi.spyOn(dialogActions, 'closeActiveDialog')
    const addToast = vi.spyOn(appToastManager, 'add').mockReturnValue('toast-1')

    confirmStartOver()

    expect(close).toHaveBeenCalledTimes(1)
    expect(resetSceneToDefaults).toHaveBeenCalledTimes(1)
    expect(addToast).toHaveBeenCalledTimes(1)
    expect(addToast).toHaveBeenCalledWith(
      expect.objectContaining({ title: STARTED_OVER_MESSAGE, type: 'success' }),
    )
    // The toast is the single surface; the polite channel stays silent.
    expect(feedbackStoreForTests.getState().polite.text).toBe('')
  })
})
