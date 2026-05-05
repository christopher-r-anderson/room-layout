import { describe, expect, it } from 'vitest'
import {
  runStartupAssetErrorTransition,
  runStartupRetryTransition,
} from './startup-transitions'

describe('startup transition sequencing', () => {
  it('records the asset error before resetting the editor shell', () => {
    const steps: string[] = []
    const error = new Error('asset load failed')

    runStartupAssetErrorTransition(error, {
      closeAllDialogs: () => {
        steps.push('closeAllDialogs')
      },
      recordAssetError: () => {
        steps.push('recordAssetError')
      },
      resetEditorShellState: () => {
        steps.push('resetEditorShellState')
      },
    })

    expect(steps).toEqual([
      'recordAssetError',
      'closeAllDialogs',
      'resetEditorShellState',
    ])
  })

  it('resets the editor shell before retrying asset loading', () => {
    const steps: string[] = []

    runStartupRetryTransition({
      closeAllDialogs: () => {
        steps.push('closeAllDialogs')
      },
      resetEditorShellState: () => {
        steps.push('resetEditorShellState')
      },
      retryAssetLoading: () => {
        steps.push('retryAssetLoading')
      },
    })

    expect(steps).toEqual([
      'closeAllDialogs',
      'resetEditorShellState',
      'retryAssetLoading',
    ])
  })
})
