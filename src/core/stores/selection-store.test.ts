// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
} from './selection-store'

beforeEach(() => {
  resetSelectionStore()
})

describe('useSelectionStore', () => {
  it('writes the selected id', () => {
    expect(useSelectionStore.getState().selectedId).toBeNull()

    selectionActions.setSelection('chair-1')

    expect(useSelectionStore.getState().selectedId).toBe('chair-1')

    selectionActions.setSelection('chair-2')

    expect(useSelectionStore.getState().selectedId).toBe('chair-2')
  })

  it('clears the selection', () => {
    selectionActions.setSelection('chair-1')

    selectionActions.setSelection(null)

    expect(useSelectionStore.getState().selectedId).toBeNull()
  })

  it('resets the selection session to defaults', () => {
    selectionActions.setSelection('chair-1')

    resetSelectionStore()

    expect(useSelectionStore.getState()).toMatchObject({
      selectedId: null,
    })
  })
})
