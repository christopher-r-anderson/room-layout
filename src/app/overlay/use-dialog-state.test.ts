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
          canStartOver: true,
        }),
      {
        initialProps,
      },
    )

    act(() => {
      result.current.openDelete()
    })

    expect(result.current.isDeleteDialogOpen).toBe(true)
    expect(result.current.returnFocusTarget).toBeNull()
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
          canStartOver: true,
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
    expect(result.current.isEnvironmentDesktopDialogOpen).toBe(true)
    expect(result.current.environmentDialogLayout).toBe('desktop')
    expect(result.current.returnFocusTarget).toBe('environment-inline')

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
    expect(result.current.returnFocusTarget).toBe('info-inline')

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
    expect(result.current.returnFocusTarget).toBeNull()

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

  it('enforces the start over freshness guard at the dialog boundary', () => {
    const { result, rerender } = renderHook(
      (props: DialogStateHookProps & { canStartOver: boolean }) =>
        useDialogState({
          editorInteractionsEnabled: props.editorInteractionsEnabled,
          startupOverlayActive: props.startupOverlayActive,
          selectedFurniture: props.selectedFurniture,
          canStartOver: props.canStartOver,
        }),
      {
        initialProps: {
          editorInteractionsEnabled: true,
          startupOverlayActive: false,
          selectedFurniture: null,
          canStartOver: false,
        },
      },
    )

    act(() => {
      expect(result.current.openStartOver()).toBe(false)
    })
    expect(result.current.isStartOverDialogOpen).toBe(false)

    rerender({
      editorInteractionsEnabled: true,
      startupOverlayActive: false,
      selectedFurniture: null,
      canStartOver: true,
    })
    act(() => {
      expect(result.current.openStartOver()).toBe(true)
    })
    expect(result.current.isStartOverDialogOpen).toBe(true)
  })

  it('supports boolean open-change handlers for environment and info dialogs', () => {
    const { result } = renderHook(() =>
      useDialogState({
        editorInteractionsEnabled: true,
        startupOverlayActive: false,
        selectedFurniture: LEATHER_COUCH,
        canStartOver: true,
      }),
    )

    act(() => {
      expect(result.current.setEnvironmentOpen(true)).toBe(true)
    })
    expect(result.current.isEnvironmentDialogOpen).toBe(true)
    expect(result.current.isEnvironmentDesktopDialogOpen).toBe(true)

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

  it('clears layout-specific dialog keys when switching to an incompatible layout mode', () => {
    const { result } = renderHook(() =>
      useDialogState({
        editorInteractionsEnabled: true,
        startupOverlayActive: false,
        selectedFurniture: LEATHER_COUCH,
        canStartOver: true,
      }),
    )

    act(() => {
      expect(
        result.current.openEnvironment({
          layout: 'desktop',
          returnFocusTarget: 'environment-inline',
        }),
      ).toBe(true)
    })

    expect(result.current.isEnvironmentDialogOpen).toBe(true)
    expect(result.current.isEnvironmentDesktopDialogOpen).toBe(true)
    expect(result.current.environmentDialogLayout).toBe('desktop')
    expect(result.current.returnFocusTarget).toBe('environment-inline')

    act(() => {
      result.current.syncLayoutMode('mobile')
    })

    expect(result.current.isEnvironmentDialogOpen).toBe(false)
    expect(result.current.activeDialog).toBeNull()
    expect(result.current.returnFocusTarget).toBeNull()

    act(() => {
      expect(
        result.current.openEnvironment({
          layout: 'mobile',
          returnFocusTarget: 'mobile-more',
        }),
      ).toBe(true)
    })

    expect(result.current.isEnvironmentDialogOpen).toBe(true)
    expect(result.current.isEnvironmentMobileDialogOpen).toBe(true)
    expect(result.current.environmentDialogLayout).toBe('mobile')
    expect(result.current.returnFocusTarget).toBe('mobile-more')

    act(() => {
      result.current.syncLayoutMode('desktop')
    })

    expect(result.current.isEnvironmentDialogOpen).toBe(false)
    expect(result.current.activeDialog).toBeNull()
    expect(result.current.returnFocusTarget).toBeNull()

    act(() => {
      expect(result.current.openMobileMore()).toBe(true)
    })

    expect(result.current.isMobileMoreOpen).toBe(true)
    expect(result.current.returnFocusTarget).toBe('mobile-more')

    act(() => {
      result.current.syncLayoutMode('desktop')
    })

    expect(result.current.isMobileMoreOpen).toBe(false)
    expect(result.current.activeDialog).toBeNull()
    expect(result.current.returnFocusTarget).toBeNull()
  })

  it('allows mobile More to hand off directly into another dialog in the same turn', () => {
    const { result } = renderHook(() =>
      useDialogState({
        editorInteractionsEnabled: true,
        startupOverlayActive: false,
        selectedFurniture: LEATHER_COUCH,
        canStartOver: true,
      }),
    )

    act(() => {
      expect(result.current.openMobileMore()).toBe(true)
    })

    expect(result.current.isMobileMoreOpen).toBe(true)

    act(() => {
      expect(
        result.current.setMobileMoreOpen(false, {
          returnFocusTarget: 'mobile-more',
        }),
      ).toBe(true)
      expect(
        result.current.setKeyboardShortcutsOpen(true, {
          returnFocusTarget: 'mobile-more',
        }),
      ).toBe(true)
    })

    expect(result.current.isKeyboardShortcutsDialogOpen).toBe(true)
    expect(result.current.isMobileMoreOpen).toBe(false)
    expect(result.current.returnFocusTarget).toBe('mobile-more')
  })

  it('remaps return focus targets for header dialogs across layout changes', () => {
    const { result } = renderHook(() =>
      useDialogState({
        editorInteractionsEnabled: true,
        startupOverlayActive: false,
        selectedFurniture: LEATHER_COUCH,
        canStartOver: true,
      }),
    )

    act(() => {
      expect(
        result.current.openKeyboardShortcuts({
          returnFocusTarget: 'mobile-more',
        }),
      ).toBe(true)
    })
    act(() => {
      result.current.syncLayoutMode('desktop')
    })
    expect(result.current.isKeyboardShortcutsDialogOpen).toBe(true)
    expect(result.current.returnFocusTarget).toBe('keyboard-inline')
    act(() => {
      result.current.closeDialog()
    })

    act(() => {
      expect(
        result.current.openInfo({ returnFocusTarget: 'mobile-more' }),
      ).toBe(true)
    })
    act(() => {
      result.current.syncLayoutMode('desktop')
    })
    expect(result.current.isInfoDialogOpen).toBe(true)
    expect(result.current.returnFocusTarget).toBe('info-inline')
    act(() => {
      result.current.closeDialog()
    })

    act(() => {
      expect(
        result.current.openStartOver({ returnFocusTarget: 'mobile-more' }),
      ).toBe(true)
    })
    act(() => {
      result.current.syncLayoutMode('desktop')
    })
    expect(result.current.isStartOverDialogOpen).toBe(true)
    expect(result.current.returnFocusTarget).toBe('start-over-inline')
    act(() => {
      result.current.closeDialog()
    })

    act(() => {
      expect(result.current.openKeyboardShortcuts()).toBe(true)
    })
    act(() => {
      result.current.syncLayoutMode('mobile')
    })
    expect(result.current.isKeyboardShortcutsDialogOpen).toBe(true)
    expect(result.current.returnFocusTarget).toBe('mobile-more')
    act(() => {
      result.current.closeDialog()
    })

    act(() => {
      expect(result.current.openInfo()).toBe(true)
    })
    act(() => {
      result.current.syncLayoutMode('mobile')
    })
    expect(result.current.isInfoDialogOpen).toBe(true)
    expect(result.current.returnFocusTarget).toBe('mobile-more')
    act(() => {
      result.current.closeDialog()
    })

    act(() => {
      expect(result.current.openStartOver()).toBe(true)
    })
    act(() => {
      result.current.syncLayoutMode('mobile')
    })
    expect(result.current.isStartOverDialogOpen).toBe(true)
    expect(result.current.returnFocusTarget).toBe('mobile-more')
  })

  it('defaults shortcut-opened start over to the mobile more trigger on narrow layouts', () => {
    const { result } = renderHook(() =>
      useDialogState({
        editorInteractionsEnabled: true,
        startupOverlayActive: false,
        selectedFurniture: LEATHER_COUCH,
        canStartOver: true,
      }),
    )

    act(() => {
      result.current.syncLayoutMode('mobile')
    })

    act(() => {
      expect(result.current.openStartOver()).toBe(true)
    })

    expect(result.current.isStartOverDialogOpen).toBe(true)
    expect(result.current.returnFocusTarget).toBe('mobile-more')
  })
})
