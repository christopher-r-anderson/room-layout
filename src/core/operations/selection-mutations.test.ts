import { afterEach, beforeEach, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
  useSceneDocumentStore,
} from '@/core/stores/scene-document-store'
import { CHAIR } from '@/test/support/furniture'
import { clearSelection, selectById } from './selection-mutations'

beforeEach(() => {
  resetSceneDocumentStore()
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
})

afterEach(resetSceneDocumentStore)

it('selectById selects an existing item', () => {
  expect(selectById(CHAIR.id)).toEqual({ ok: true, status: 'selected' })
  expect(useSceneDocumentStore.getState().selectedId).toBe(CHAIR.id)
})

it('selectById clears the selection for a null id', () => {
  sceneDocumentActions.setSelectedId(CHAIR.id)

  expect(selectById(null)).toEqual({ ok: true, status: 'cleared' })
  expect(useSceneDocumentStore.getState().selectedId).toBeNull()
})

it('selectById reports not-found and keeps the current selection', () => {
  sceneDocumentActions.setSelectedId(CHAIR.id)

  expect(selectById('ghost')).toEqual({ ok: false, status: 'not-found' })
  expect(useSceneDocumentStore.getState().selectedId).toBe(CHAIR.id)
})

it('selectById is blocked while a drag is in progress', () => {
  sceneDocumentActions.setDragging(true)

  expect(selectById(CHAIR.id)).toEqual({
    ok: false,
    status: 'blocked-dragging',
  })
  expect(useSceneDocumentStore.getState().selectedId).toBeNull()
})

it('clearSelection is a no-op while a drag is in progress', () => {
  sceneDocumentActions.setSelectedId(CHAIR.id)
  sceneDocumentActions.setDragging(true)

  clearSelection()

  expect(useSceneDocumentStore.getState().selectedId).toBe(CHAIR.id)
})

it('clearSelection clears the selection outside a drag', () => {
  sceneDocumentActions.setSelectedId(CHAIR.id)

  clearSelection()

  expect(useSceneDocumentStore.getState().selectedId).toBeNull()
})
