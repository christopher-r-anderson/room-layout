import { afterEach, describe, expect, it, vi } from 'vitest'
import { dialogActions } from '@/core/stores/dialog-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import { startOverIntent } from './start-over-actions'

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
})
