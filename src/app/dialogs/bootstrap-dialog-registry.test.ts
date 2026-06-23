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
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import {
  bootstrapDialogRegistry,
  buildDialogRuntimeContext,
  resetDialogRegistryForTests,
} from './bootstrap-dialog-registry'

const CHAIR = {
  id: 'chair-1',
  catalogId: 'chair',
  collectionId: 'chairs',
  footprintSize: { width: 1, depth: 1 },
  kind: 'armchair' as const,
  name: 'Chair',
  nodeName: 'ChairNode',
  position: [0, 0, 0] as [number, number, number],
  rotationY: 0,
  sourcePath: '/models/chair.glb',
}

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
