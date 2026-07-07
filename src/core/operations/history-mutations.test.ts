import { afterEach, beforeEach, expect, it } from 'vitest'
import {
  commitHistoryPresent,
  createHistoryState,
} from '@/shared/lib/ui/editor-history'
import type { FurnitureCatalogEntry } from '@/domain/catalog'
import type { FurnitureItem } from '@/domain/furniture'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import {
  resetSceneSessionStore,
  sceneSessionActions,
} from '@/core/stores/scene-session-store'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
import { assetsActions, resetAssetsStore } from '@/core/stores/assets-store'
import {
  registerParsedCollectionScene,
  resetCollectionSceneRegistry,
  type CollectionNodeDefaults,
} from '@/core/stores/collection-scene-registry'
import { CHAIR } from '@/test/support/furniture'
import { redo, restoreInitialLayout, undo } from './history-mutations'

const CATALOG_CHAIR: FurnitureCatalogEntry = {
  id: CHAIR.catalogId,
  name: CHAIR.name,
  kind: CHAIR.kind,
  collectionId: CHAIR.collectionId,
  nodeName: CHAIR.nodeName,
  footprintSize: CHAIR.footprintSize,
  previewPath: '/previews/chair.png',
}

function seedCommittedChairHistory() {
  sceneDocumentActions.setHistory(
    commitHistoryPresent(createHistoryState<FurnitureItem[]>([]), [CHAIR]),
  )
  selectionActions.setSelection(CHAIR.id, null)
}

function seedLoadedChairCollection() {
  assetsActions.setAssets({
    catalog: [CATALOG_CHAIR],
    collections: [{ id: CHAIR.collectionId, sourcePath: CHAIR.sourcePath }],
    environmentConfig: null,
  })
  registerParsedCollectionScene(
    CHAIR.sourcePath,
    {},
    new Map<string, CollectionNodeDefaults>([
      [CHAIR.nodeName, { position: [0, 0, 0], rotationY: 0 }],
    ]),
  )
}

function resetAllStores() {
  resetSceneDocumentStore()
  resetSceneSessionStore()
  resetSelectionStore()
  resetAssetsStore()
  resetCollectionSceneRegistry()
}

beforeEach(resetAllStores)
afterEach(resetAllStores)

it('undo and redo round-trip the history and reconcile the selection', () => {
  seedCommittedChairHistory()

  expect(undo()).toBe(true)

  expect(useSceneDocumentStore.getState().history.present).toEqual([])
  // The selected item no longer exists in the undone state.
  expect(useSelectionStore.getState().selectedId).toBeNull()

  expect(redo()).toBe(true)

  expect(useSceneDocumentStore.getState().history.present).toEqual([CHAIR])
  expect(useSelectionStore.getState().selectedId).toBeNull()
})

it('undo and redo report false when there is nothing to step to', () => {
  expect(undo()).toBe(false)
  expect(redo()).toBe(false)
})

it('undo and redo are blocked while a drag is in progress', () => {
  seedCommittedChairHistory()
  sceneSessionActions.setDragging(true)

  expect(undo()).toBe(false)

  expect(useSceneDocumentStore.getState().history.present).toEqual([CHAIR])
  expect(useSelectionStore.getState().selectedId).toBe(CHAIR.id)
  expect(redo()).toBe(false)
})

it('restoreInitialLayout seeds a fresh history, instance counter, and cleared selection', () => {
  seedLoadedChairCollection()
  seedCommittedChairHistory()

  restoreInitialLayout([
    {
      id: 'furniture-instance-3',
      catalogId: CATALOG_CHAIR.id,
      position: [1, 0, 1],
      rotationY: Math.PI / 2,
    },
  ])

  const state = useSceneDocumentStore.getState()
  expect(state.history.past).toEqual([])
  expect(state.history.future).toEqual([])
  expect(state.history.present).toHaveLength(1)
  expect(state.history.present[0]).toMatchObject({
    id: 'furniture-instance-3',
    catalogId: CATALOG_CHAIR.id,
    nodeName: CHAIR.nodeName,
    sourcePath: CHAIR.sourcePath,
    position: [1, 0, 1],
    rotationY: Math.PI / 2,
  })
  expect(state.instanceIdCounter).toBe(3)
  expect(useSelectionStore.getState().selectedId).toBeNull()
})
