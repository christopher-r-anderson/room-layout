import { afterEach, beforeEach, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import {
  resetSelectionStore,
  selectionActions,
  useSelectionStore,
} from '@/core/stores/selection-store'
import { CHAIR } from '@/test/support/furniture'
import {
  applySelection,
  clearSelection,
  selectById,
} from './selection-mutations'

function resetStores() {
  resetSceneDocumentStore()
  resetSelectionStore()
}

beforeEach(() => {
  resetStores()
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
})

afterEach(resetStores)

it('selectById selects an existing item and records the source', () => {
  expect(selectById(CHAIR.id, 'panel-keyboard')).toEqual({
    ok: true,
    status: 'selected',
  })
  expect(useSelectionStore.getState().selectedId).toBe(CHAIR.id)
  expect(useSelectionStore.getState().selectedSource).toBe('panel-keyboard')
})

it('selectById clears the selection for a null id', () => {
  selectionActions.setSelection(CHAIR.id, 'canvas-pointer')

  expect(selectById(null)).toEqual({ ok: true, status: 'cleared' })
  expect(useSelectionStore.getState().selectedId).toBeNull()
  expect(useSelectionStore.getState().selectedSource).toBeNull()
})

it('selectById reports not-found and keeps the current selection', () => {
  selectionActions.setSelection(CHAIR.id, 'canvas-pointer')

  expect(selectById('ghost')).toEqual({ ok: false, status: 'not-found' })
  expect(useSelectionStore.getState().selectedId).toBe(CHAIR.id)
})

it('selectById is blocked while a drag is in progress', () => {
  sceneDocumentActions.setDragging(true)

  expect(selectById(CHAIR.id)).toEqual({
    ok: false,
    status: 'blocked-dragging',
  })
  expect(useSelectionStore.getState().selectedId).toBeNull()
})

it('clearSelection is a no-op while a drag is in progress', () => {
  selectionActions.setSelection(CHAIR.id, 'canvas-pointer')
  sceneDocumentActions.setDragging(true)

  clearSelection()

  expect(useSelectionStore.getState().selectedId).toBe(CHAIR.id)
})

it('clearSelection clears the selection outside a drag', () => {
  selectionActions.setSelection(CHAIR.id, 'canvas-pointer')

  clearSelection()

  expect(useSelectionStore.getState().selectedId).toBeNull()
  expect(useSelectionStore.getState().selectedSource).toBeNull()
})

it('applySelection clears the hover preview whenever the pointer changes', () => {
  sceneDocumentActions.setPreviewedId(CHAIR.id)

  applySelection(CHAIR.id, 'canvas-pointer')

  expect(useSelectionStore.getState().selectedId).toBe(CHAIR.id)
  expect(useSceneDocumentStore.getState().previewedIdRaw).toBeNull()

  sceneDocumentActions.setPreviewedId(CHAIR.id)
  applySelection(null, null)

  expect(useSelectionStore.getState().selectedId).toBeNull()
  expect(useSceneDocumentStore.getState().previewedIdRaw).toBeNull()
})

it('applySelection keeps the hover preview when the pointer does not move', () => {
  applySelection(CHAIR.id, 'canvas-pointer')
  sceneDocumentActions.setPreviewedId(CHAIR.id)

  applySelection(CHAIR.id, 'canvas-pointer')

  expect(useSceneDocumentStore.getState().previewedIdRaw).toBe(CHAIR.id)
})
