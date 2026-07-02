// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  dialogActions,
  dialogStoreForTests,
  resetDialogStore,
} from '@/core/stores/dialog-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { DIALOG_DEFINITIONS } from '@/app/dialogs/dialog-registry'
import { catalogDialogId } from '@/features/catalog/catalog-dialog-definition'
import { CHAIR } from '@/test/support/furniture'
import {
  bootstrapDialogRegistry,
  buildDialogRuntimeContext,
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

    expect(Object.keys(dialogStoreForTests.getState().registry).sort()).toEqual(
      DIALOG_DEFINITIONS.map((definition) => definition.id).sort(),
    )
    expect(dialogActions.openDialog(catalogDialogId)).toBe(true)
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
    expect(secondRegistryKeys).toHaveLength(DIALOG_DEFINITIONS.length)
  })
})

describe('buildDialogRuntimeContext', () => {
  beforeEach(() => {
    resetEditorLifecycleStore()
    resetSceneDocumentStore()
  })

  it('derives dialog readiness from editor runtime store', () => {
    const context = buildDialogRuntimeContext({
      canStartOver: () => true,
    })

    expect(context.isDialogsEnabled()).toBe(false)

    editorLifecycleActions.markAssetsReady()

    expect(context.isDialogsEnabled()).toBe(true)
  })

  it('reads selected furniture from scene store state', () => {
    const context = buildDialogRuntimeContext({
      canStartOver: () => false,
    })

    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    sceneDocumentActions.setSelectedId(CHAIR.id)

    expect(context.getSelectedFurniture()).toEqual(CHAIR)
    expect(context.canStartOver()).toBe(false)
  })
})
