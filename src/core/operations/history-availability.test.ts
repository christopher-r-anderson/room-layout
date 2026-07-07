// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, expect, it } from 'vitest'
import {
  commitHistoryPresent,
  createHistoryState,
} from '@/shared/lib/ui/editor-history'
import type { FurnitureItem } from '@/domain/furniture'
import { makeFurnitureItem } from '@/test/support/furniture'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSceneSessionStore,
  sceneSessionActions,
} from '@/core/stores/scene-session-store'
import { useHistoryAvailability } from './history-availability'

const FURNITURE_ITEM = makeFurnitureItem({ id: 'item-1', catalogId: 'chair-1' })

beforeEach(() => {
  resetSceneDocumentStore()
  resetSceneSessionStore()
})

it('derives history availability from document history and dragging state', () => {
  const { result: historyAvailability } = renderHook(() =>
    useHistoryAvailability(),
  )

  act(() => {
    sceneDocumentActions.setHistory(
      commitHistoryPresent(createHistoryState<FurnitureItem[]>([]), [
        FURNITURE_ITEM,
      ]),
    )
  })

  expect(historyAvailability.current).toEqual({
    canUndo: true,
    canRedo: false,
  })

  act(() => {
    sceneSessionActions.setDragging(true)
  })

  expect(historyAvailability.current).toEqual({
    canUndo: false,
    canRedo: false,
  })
})
