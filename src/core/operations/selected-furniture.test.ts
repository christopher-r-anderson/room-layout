// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSelectionStore,
  selectionActions,
} from '@/core/stores/selection-store'
import { CHAIR } from '@/test/support/furniture'
import {
  getSelectedFurniture,
  useSelectedFurniture,
} from './selected-furniture'

beforeEach(() => {
  resetSceneDocumentStore()
  resetSelectionStore()
})

it('joins the selection pointer with the document items', () => {
  const { result } = renderHook(() => useSelectedFurniture())

  expect(result.current).toBeNull()

  act(() => {
    sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
    selectionActions.setSelection(CHAIR.id, 'canvas-pointer')
  })

  expect(result.current).toEqual(CHAIR)

  act(() => {
    selectionActions.setSelection(null, null)
  })

  expect(result.current).toBeNull()
})

it('returns null when the pointed-at item is not in the document', () => {
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
  selectionActions.setSelection('ghost', 'canvas-pointer')

  expect(getSelectedFurniture()).toBeNull()
})

it('reads the selected item imperatively', () => {
  sceneDocumentActions.setHistory(createHistoryState([CHAIR]))
  selectionActions.setSelection(CHAIR.id, 'panel-keyboard')

  expect(getSelectedFurniture()).toEqual(CHAIR)
})
