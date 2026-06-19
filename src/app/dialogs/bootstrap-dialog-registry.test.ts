// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  dialogActions,
  dialogStoreForTests,
  resetDialogStore,
} from '@/editor-state/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import {
  bootstrapDialogRegistry,
  resetDialogRegistryForTests,
} from './bootstrap-dialog-registry'

function createContext() {
  return {
    isDialogsEnabled: () => true,
    getSelectedFurniture: () => null,
    canStartOver: () => true,
  }
}

describe('bootstrapDialogRegistry', () => {
  beforeEach(() => {
    resetDialogStore()
    resetDialogRegistryForTests()
  })

  it('registers dialog definitions and configures runtime context', () => {
    bootstrapDialogRegistry(createContext())

    expect(Object.keys(dialogStoreForTests.getState().registry).length).toBe(7)
    expect(dialogActions.openDialog(DIALOG_IDS.catalog)).toBe(true)
  })

  it('is idempotent and does not duplicate registrations', () => {
    bootstrapDialogRegistry(createContext())
    const firstRegistryKeys = Object.keys(
      dialogStoreForTests.getState().registry,
    )

    bootstrapDialogRegistry(createContext())
    const secondRegistryKeys = Object.keys(
      dialogStoreForTests.getState().registry,
    )

    expect(secondRegistryKeys).toEqual(firstRegistryKeys)
    expect(secondRegistryKeys.length).toBe(7)
  })
})
