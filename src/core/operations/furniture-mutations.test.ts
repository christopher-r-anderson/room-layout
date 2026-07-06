import { afterEach, beforeEach, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import type { FurnitureCatalogEntry } from '@/domain/catalog'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { assetsActions, resetAssetsStore } from '@/core/stores/assets-store'
import {
  registerParsedCollectionScene,
  resetCollectionSceneRegistry,
  type CollectionNodeDefaults,
} from '@/core/stores/collection-scene-registry'
import { CHAIR } from '@/test/support/furniture'
import {
  addFurniture,
  deleteSelection,
  moveSelection,
  rotateSelection,
  setSelectionTransform,
} from './furniture-mutations'

const CATALOG_CHAIR: FurnitureCatalogEntry = {
  id: CHAIR.catalogId,
  name: CHAIR.name,
  kind: CHAIR.kind,
  collectionId: CHAIR.collectionId,
  nodeName: CHAIR.nodeName,
  footprintSize: CHAIR.footprintSize,
  previewPath: '/previews/chair.png',
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

function seedSelectedChair() {
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
  sceneDocumentActions.setSelectedId(CHAIR.id)
}

function resetAllStores() {
  resetSceneDocumentStore()
  resetAssetsStore()
  resetCollectionSceneRegistry()
}

beforeEach(resetAllStores)
afterEach(resetAllStores)

it('addFurniture spawns the catalog item, selects it, and bumps the instance counter', () => {
  seedLoadedChairCollection()

  const result = addFurniture(CATALOG_CHAIR.id)

  expect(result).toEqual({ ok: true, id: 'furniture-instance-1' })
  const state = useSceneDocumentStore.getState()
  expect(state.history.present).toHaveLength(1)
  expect(state.history.present[0]).toMatchObject({
    id: 'furniture-instance-1',
    catalogId: CATALOG_CHAIR.id,
    nodeName: CHAIR.nodeName,
    sourcePath: CHAIR.sourcePath,
  })
  expect(state.selectedId).toBe('furniture-instance-1')
  expect(state.instanceIdCounter).toBe(1)
})

it('addFurniture reports unknown-catalog and leaves the document untouched', () => {
  seedLoadedChairCollection()

  const result = addFurniture('missing-catalog')

  expect(result).toEqual({ ok: false, reason: 'unknown-catalog' })
  const state = useSceneDocumentStore.getState()
  expect(state.history.present).toEqual([])
  expect(state.selectedId).toBeNull()
  expect(state.instanceIdCounter).toBe(0)
})

it('moveSelection refuses to move while a drag is in progress', () => {
  seedSelectedChair()
  sceneDocumentActions.setDragging(true)

  const result = moveSelection({ x: 1, z: 0 })

  expect(result).toEqual({ ok: false, reason: 'dragging' })
  expect(useSceneDocumentStore.getState().history.present[0]?.position).toEqual(
    [0, 0, 0],
  )
})

it('moveSelection moves the selected item and commits a history entry', () => {
  seedSelectedChair()

  const result = moveSelection({ x: 1, z: 0 })

  expect(result).toEqual({ ok: true, position: [1, 0, 0] })
  const state = useSceneDocumentStore.getState()
  expect(state.history.present[0]?.position).toEqual([1, 0, 0])
  expect(state.history.past).toHaveLength(1)
})

it('setSelectionTransform applies position and rotation and commits a history entry', () => {
  seedSelectedChair()

  const result = setSelectionTransform({
    position: [1, 0, 1],
    rotationY: Math.PI / 2,
  })

  expect(result).toMatchObject({
    ok: true,
    item: {
      id: CHAIR.id,
      position: [1, 0, 1],
      rotationY: Math.PI / 2,
    },
  })
  const state = useSceneDocumentStore.getState()
  expect(state.history.present[0]).toMatchObject({
    position: [1, 0, 1],
    rotationY: Math.PI / 2,
  })
  expect(state.history.past).toHaveLength(1)
})

it('setSelectionTransform refuses to apply while a drag is in progress', () => {
  seedSelectedChair()
  sceneDocumentActions.setDragging(true)

  const result = setSelectionTransform({ position: [1, 0, 1] })

  expect(result).toEqual({ ok: false, reason: 'dragging' })
  expect(useSceneDocumentStore.getState().history.present[0]?.position).toEqual(
    [0, 0, 0],
  )
})

it('setSelectionTransform rejects an out-of-bounds position and leaves the document untouched', () => {
  seedSelectedChair()

  const result = setSelectionTransform({ position: [100, 0, 0] })

  expect(result).toEqual({ ok: false, reason: 'blocked-bounds' })
  const state = useSceneDocumentStore.getState()
  expect(state.history.present[0]?.position).toEqual([0, 0, 0])
  expect(state.history.past).toHaveLength(0)
})

it('rotateSelection rotates the selected item and commits a history entry', () => {
  seedSelectedChair()

  rotateSelection(Math.PI / 2)

  const state = useSceneDocumentStore.getState()
  expect(state.history.present[0]?.rotationY).toBeCloseTo(Math.PI / 2)
  expect(state.history.past).toHaveLength(1)
})

it('rotateSelection is a no-op without a selection', () => {
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))

  rotateSelection(Math.PI / 2)

  const state = useSceneDocumentStore.getState()
  expect(state.history.present[0]?.rotationY).toBe(0)
  expect(state.history.past).toHaveLength(0)
})

it('deleteSelection removes the selected item and clears the selection', () => {
  seedSelectedChair()

  expect(deleteSelection()).toBe(true)

  const state = useSceneDocumentStore.getState()
  expect(state.history.present).toEqual([])
  expect(state.selectedId).toBeNull()
})

it('deleteSelection reports false when nothing is selected', () => {
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))

  expect(deleteSelection()).toBe(false)
  expect(useSceneDocumentStore.getState().history.present).toEqual([CHAIR])
})
