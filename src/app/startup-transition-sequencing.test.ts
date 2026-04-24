import { describe, expect, it } from 'vitest'
import {
  runStartupAssetErrorTransition,
  runStartupRetryTransition,
} from './startup-transition-sequencing'

describe('startup transition sequencing', () => {
  it('records the asset error before resetting the editor shell', () => {
    const steps: string[] = []
    const error = new Error('asset load failed')

    runStartupAssetErrorTransition(error, {
      closeOpenDialogs: () => {
        steps.push('closeOpenDialogs')
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
      'closeOpenDialogs',
      'resetEditorShellState',
    ])
  })

  it('resets the editor shell before retrying asset loading', () => {
    const steps: string[] = []

    runStartupRetryTransition({
      closeOpenDialogs: () => {
        steps.push('closeOpenDialogs')
      },
      resetEditorShellState: () => {
        steps.push('resetEditorShellState')
      },
      retryAssetLoading: () => {
        steps.push('retryAssetLoading')
      },
    })

    expect(steps).toEqual([
      'closeOpenDialogs',
      'resetEditorShellState',
      'retryAssetLoading',
    ])
  })
})
