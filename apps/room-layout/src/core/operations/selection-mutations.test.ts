import { afterEach, beforeEach, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSceneSessionStore,
  sceneSessionActions,
  useSceneSessionStore,
} from '@/core/stores/scene-session-store'
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
  resetSceneSessionStore()
  resetSelectionStore()
}

beforeEach(() => {
  resetStores()
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
})

afterEach(resetStores)

it('selectById selects an existing item', () => {
  expect(selectById(CHAIR.id)).toEqual({
    ok: true,
    status: 'selected',
  })
  expect(useSelectionStore.getState().selectedId).toBe(CHAIR.id)
})

it('selectById clears the selection for a null id', () => {
  selectionActions.setSelection(CHAIR.id)

  expect(selectById(null)).toEqual({ ok: true, status: 'cleared' })
  expect(useSelectionStore.getState().selectedId).toBeNull()
})

it('selectById reports not-found and keeps the current selection', () => {
  selectionActions.setSelection(CHAIR.id)

  expect(selectById('ghost')).toEqual({ ok: false, status: 'not-found' })
  expect(useSelectionStore.getState().selectedId).toBe(CHAIR.id)
})

it('selectById is blocked while a drag is in progress', () => {
  sceneSessionActions.setDragging(true)

  expect(selectById(CHAIR.id)).toEqual({
    ok: false,
    status: 'blocked-dragging',
  })
  expect(useSelectionStore.getState().selectedId).toBeNull()
})

it('clearSelection is a no-op while a drag is in progress', () => {
  selectionActions.setSelection(CHAIR.id)
  sceneSessionActions.setDragging(true)

  clearSelection()

  expect(useSelectionStore.getState().selectedId).toBe(CHAIR.id)
})

it('clearSelection clears the selection outside a drag', () => {
  selectionActions.setSelection(CHAIR.id)

  clearSelection()

  expect(useSelectionStore.getState().selectedId).toBeNull()
})

it('applySelection clears the hover preview whenever the pointer changes', () => {
  sceneSessionActions.setPreviewedId(CHAIR.id)

  applySelection(CHAIR.id)

  expect(useSelectionStore.getState().selectedId).toBe(CHAIR.id)
  expect(useSceneSessionStore.getState().previewedIdRaw).toBeNull()

  sceneSessionActions.setPreviewedId(CHAIR.id)
  applySelection(null)

  expect(useSelectionStore.getState().selectedId).toBeNull()
  expect(useSceneSessionStore.getState().previewedIdRaw).toBeNull()
})

it('applySelection keeps the hover preview when the pointer does not move', () => {
  applySelection(CHAIR.id)
  sceneSessionActions.setPreviewedId(CHAIR.id)

  applySelection(CHAIR.id)

  expect(useSceneSessionStore.getState().previewedIdRaw).toBe(CHAIR.id)
})
