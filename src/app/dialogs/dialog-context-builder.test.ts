// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from 'vitest'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/editor-state/editor-runtime-store'
import {
  resetSceneStateStore,
  sceneStateActions,
} from '@/editor-state/scene-state-store'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import { buildDialogRuntimeContext } from './dialog-context-builder'

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

describe('buildDialogRuntimeContext', () => {
  beforeEach(() => {
    resetEditorRuntimeStore()
    resetSceneStateStore()
  })

  it('derives dialog readiness from editor runtime store', () => {
    const context = buildDialogRuntimeContext({
      canStartOver: () => true,
    })

    expect(context.isDialogsEnabled()).toBe(false)

    editorRuntimeActions.markAssetsReady()

    expect(context.isDialogsEnabled()).toBe(true)
  })

  it('reads selected furniture from scene store state', () => {
    const context = buildDialogRuntimeContext({
      canStartOver: () => false,
    })

    sceneStateActions.setHistory(createHistoryState([CHAIR]))
    sceneStateActions.setSelectedId(CHAIR.id)

    expect(context.getSelectedFurniture()).toEqual(CHAIR)
    expect(context.canStartOver()).toBe(false)
  })
})
