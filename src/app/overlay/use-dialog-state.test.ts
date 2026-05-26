// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { useDialogState } from './use-dialog-state'

interface DialogStateHookProps {
  editorInteractionsEnabled: boolean
  startupOverlayActive: boolean
  selectedFurniture: FurnitureItem | null
}

interface DeleteSnapshotHookProps {
  selectedFurniture: FurnitureItem | null
}

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
    const initialProps: DeleteSnapshotHookProps = {
      selectedFurniture: LEATHER_COUCH,
    }

    const { result, rerender } = renderHook(
      ({ selectedFurniture }: DeleteSnapshotHookProps) =>
        useDialogState({
          editorInteractionsEnabled: true,
          startupOverlayActive: false,
          selectedFurniture,
          canStartNewScene: true,
        }),
      {
        initialProps,
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
    const initialProps: DialogStateHookProps = {
      editorInteractionsEnabled: true,
      startupOverlayActive: false,
      selectedFurniture: LEATHER_COUCH,
    }

    const { result, rerender } = renderHook(
      ({
        editorInteractionsEnabled,
        selectedFurniture,
        startupOverlayActive,
      }: DialogStateHookProps) =>
        useDialogState({
          editorInteractionsEnabled,
          startupOverlayActive,
          selectedFurniture,
          canStartNewScene: true,
        }),
      {
        initialProps,
      },
    )

    act(() => {
      result.current.openCatalog()
    })
    expect(result.current.isCatalogDrawerOpen).toBe(true)

    act(() => {
      expect(result.current.openEnvironment()).toBe(false)
      expect(result.current.openInfo()).toBe(false)
      expect(result.current.openDelete()).toBe(false)
    })
    expect(result.current.isEnvironmentDialogOpen).toBe(false)
    expect(result.current.isInfoDialogOpen).toBe(false)
    expect(result.current.isDeleteDialogOpen).toBe(false)

    act(() => {
      result.current.closeDialog()
    })

    act(() => {
      result.current.openEnvironment()
    })
    expect(result.current.isEnvironmentDialogOpen).toBe(true)

    act(() => {
      expect(result.current.openCatalog()).toBe(false)
      expect(result.current.openInfo()).toBe(false)
      expect(result.current.openDelete()).toBe(false)
    })
    expect(result.current.isCatalogDrawerOpen).toBe(false)
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
      expect(result.current.openEnvironment()).toBe(false)
      expect(result.current.openDelete()).toBe(false)
    })
    expect(result.current.isCatalogDrawerOpen).toBe(false)
    expect(result.current.isEnvironmentDialogOpen).toBe(false)
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
      expect(result.current.openEnvironment()).toBe(false)
      expect(result.current.openInfo()).toBe(false)
    })
    expect(result.current.isCatalogDrawerOpen).toBe(false)
    expect(result.current.isEnvironmentDialogOpen).toBe(false)
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
      expect(result.current.openEnvironment()).toBe(false)
    })
    expect(result.current.isModalOpen).toBe(false)

    rerender({
      editorInteractionsEnabled: true,
      startupOverlayActive: true,
      selectedFurniture: LEATHER_COUCH,
    })
    act(() => {
      expect(result.current.openEnvironment()).toBe(false)
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

  it('enforces the new scene freshness guard at the dialog boundary', () => {
    const { result, rerender } = renderHook(
      (props: DialogStateHookProps & { canStartNewScene: boolean }) =>
        useDialogState({
          editorInteractionsEnabled: props.editorInteractionsEnabled,
          startupOverlayActive: props.startupOverlayActive,
          selectedFurniture: props.selectedFurniture,
          canStartNewScene: props.canStartNewScene,
        }),
      {
        initialProps: {
          editorInteractionsEnabled: true,
          startupOverlayActive: false,
          selectedFurniture: null,
          canStartNewScene: false,
        },
      },
    )

    act(() => {
      expect(result.current.openNewScene()).toBe(false)
    })
    expect(result.current.isNewSceneDialogOpen).toBe(false)

    rerender({
      editorInteractionsEnabled: true,
      startupOverlayActive: false,
      selectedFurniture: null,
      canStartNewScene: true,
    })
    act(() => {
      expect(result.current.openNewScene()).toBe(true)
    })
    expect(result.current.isNewSceneDialogOpen).toBe(true)
  })

  it('supports boolean open-change handlers for environment and info dialogs', () => {
    const { result } = renderHook(() =>
      useDialogState({
        editorInteractionsEnabled: true,
        startupOverlayActive: false,
        selectedFurniture: LEATHER_COUCH,
        canStartNewScene: true,
      }),
    )

    act(() => {
      expect(result.current.setEnvironmentOpen(true)).toBe(true)
    })
    expect(result.current.isEnvironmentDialogOpen).toBe(true)

    act(() => {
      expect(result.current.setEnvironmentOpen(false)).toBe(true)
    })
    expect(result.current.isEnvironmentDialogOpen).toBe(false)

    act(() => {
      expect(result.current.setInfoOpen(true)).toBe(true)
    })
    expect(result.current.isInfoDialogOpen).toBe(true)

    act(() => {
      expect(result.current.setEnvironmentOpen(true)).toBe(false)
    })
    expect(result.current.isEnvironmentDialogOpen).toBe(false)
  })
})
