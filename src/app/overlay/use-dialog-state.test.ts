// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { useDialogState } from './use-dialog-state'

const LEATHER_COUCH: FurnitureItem = {
  id: 'leather-couch-1',
  catalogId: 'leather-couch',
  collectionId: 'leather-collection',
  footprintSize: { width: 2.4, depth: 0.9 },
  kind: 'couch',
  name: 'Leather Couch',
  nodeName: 'LeatherCouch',
  position: [0, 0, 0],
  rotationY: 0,
  sourcePath: '/models/leather-couch.glb',
}

const END_TABLE: FurnitureItem = {
  id: 'end-table-1',
  catalogId: 'end-table',
  collectionId: 'end-table-collection',
  footprintSize: { width: 0.6, depth: 0.6 },
  kind: 'end-table',
  name: 'End Table',
  nodeName: 'EndTable',
  position: [1, 0, 1],
  rotationY: Math.PI / 2,
  sourcePath: '/models/end-table.glb',
}

describe('useDialogState', () => {
  it('keeps the pending delete snapshot stable until the dialog closes', () => {
    const { result, rerender } = renderHook(
      ({ selectedFurniture }) =>
        useDialogState({
          editorInteractionsEnabled: true,
          startupOverlayActive: false,
          selectedFurniture,
        }),
      {
        initialProps: {
          selectedFurniture: LEATHER_COUCH as FurnitureItem | null,
        },
      },
    )

    act(() => {
      result.current.openDelete()
    })

    expect(result.current.isDeleteDialogOpen).toBe(true)
    expect(result.current.pendingDeleteFurniture).toEqual(LEATHER_COUCH)

    rerender({ selectedFurniture: END_TABLE })

    expect(result.current.isDeleteDialogOpen).toBe(true)
    expect(result.current.pendingDeleteFurniture).toEqual(LEATHER_COUCH)

    act(() => {
      result.current.closeDialog()
    })

    expect(result.current.isDeleteDialogOpen).toBe(false)
    expect(result.current.pendingDeleteFurniture).toBeNull()
  })

  it('enforces the dialog mutual-exclusion matrix and delete guards', () => {
    const { result, rerender } = renderHook(
      ({
        editorInteractionsEnabled,
        selectedFurniture,
        startupOverlayActive,
      }) =>
        useDialogState({
          editorInteractionsEnabled,
          startupOverlayActive,
          selectedFurniture,
        }),
      {
        initialProps: {
          editorInteractionsEnabled: true,
          startupOverlayActive: false,
          selectedFurniture: LEATHER_COUCH as FurnitureItem | null,
        },
      },
    )

    act(() => {
      result.current.openCatalog()
    })
    expect(result.current.isCatalogDrawerOpen).toBe(true)

    act(() => {
      expect(result.current.openInfo()).toBe(false)
      expect(result.current.openDelete()).toBe(false)
    })
    expect(result.current.isInfoDialogOpen).toBe(false)
    expect(result.current.isDeleteDialogOpen).toBe(false)

    act(() => {
      result.current.closeDialog()
    })

    act(() => {
      result.current.openInfo()
    })
    expect(result.current.isInfoDialogOpen).toBe(true)

    act(() => {
      expect(result.current.openCatalog()).toBe(false)
      expect(result.current.openDelete()).toBe(false)
    })
    expect(result.current.isCatalogDrawerOpen).toBe(false)
    expect(result.current.isDeleteDialogOpen).toBe(false)

    act(() => {
      result.current.closeDialog()
    })

    act(() => {
      result.current.openDelete()
    })
    expect(result.current.isDeleteDialogOpen).toBe(true)

    act(() => {
      expect(result.current.openCatalog()).toBe(false)
      expect(result.current.openInfo()).toBe(false)
    })
    expect(result.current.isCatalogDrawerOpen).toBe(false)
    expect(result.current.isInfoDialogOpen).toBe(false)

    act(() => {
      result.current.closeDialog()
    })

    rerender({
      editorInteractionsEnabled: false,
      startupOverlayActive: false,
      selectedFurniture: LEATHER_COUCH,
    })
    act(() => {
      expect(result.current.openDelete()).toBe(false)
      expect(result.current.openCatalog()).toBe(false)
    })
    expect(result.current.isModalOpen).toBe(false)

    rerender({
      editorInteractionsEnabled: true,
      startupOverlayActive: true,
      selectedFurniture: LEATHER_COUCH,
    })
    act(() => {
      expect(result.current.openInfo()).toBe(false)
    })
    expect(result.current.isModalOpen).toBe(false)

    rerender({
      editorInteractionsEnabled: true,
      startupOverlayActive: false,
      selectedFurniture: null,
    })
    act(() => {
      expect(result.current.openDelete()).toBe(false)
    })
    expect(result.current.isDeleteDialogOpen).toBe(false)
  })
})
