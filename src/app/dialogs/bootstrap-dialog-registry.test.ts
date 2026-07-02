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
import { CATALOG_DIALOG_ID } from '@/features/catalog/catalog-dialog-definition'
import { CHAIR } from '@/test/support/furniture'
import {
  DIALOG_DEFINITIONS,
  bootstrapDialogRegistry,
  dialogRuntimeContext,
  resetDialogRegistryForTests,
} from './bootstrap-dialog-registry'

describe('bootstrapDialogRegistry', () => {
  beforeEach(() => {
    resetDialogStore()
    resetDialogRegistryForTests()
    resetEditorLifecycleStore()
    resetSceneDocumentStore()
  })

  it('registers dialog definitions and configures the runtime context', () => {
    bootstrapDialogRegistry()
    editorLifecycleActions.markAssetsReady()

    expect(Object.keys(dialogStoreForTests.getState().registry).sort()).toEqual(
      DIALOG_DEFINITIONS.map((definition) => definition.id).sort(),
    )
    expect(dialogActions.openDialog(CATALOG_DIALOG_ID)).toBe(true)
  })

  it('is idempotent and does not duplicate registrations', () => {
    bootstrapDialogRegistry()
    const firstRegistryKeys = Object.keys(
      dialogStoreForTests.getState().registry,
    )

    bootstrapDialogRegistry()
    const secondRegistryKeys = Object.keys(
      dialogStoreForTests.getState().registry,
    )

    expect(secondRegistryKeys).toEqual(firstRegistryKeys)
    expect(secondRegistryKeys).toHaveLength(DIALOG_DEFINITIONS.length)
  })
})

describe('dialogRuntimeContext', () => {
  beforeEach(() => {
    resetEditorLifecycleStore()
    resetSceneDocumentStore()
  })

  it('derives dialog readiness from the editor lifecycle store', () => {
    expect(dialogRuntimeContext.isDialogsEnabled()).toBe(false)

    editorLifecycleActions.markAssetsReady()

    expect(dialogRuntimeContext.isDialogsEnabled()).toBe(true)
  })

  it('reads selected furniture from scene store state', () => {
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    sceneDocumentActions.setSelectedId(CHAIR.id)

    expect(dialogRuntimeContext.getSelectedFurniture()).toEqual(CHAIR)
  })
})
