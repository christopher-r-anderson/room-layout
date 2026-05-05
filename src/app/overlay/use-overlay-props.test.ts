// @vitest-environment jsdom

import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { SceneReadModel } from '@/scene/scene.types'
import type { SceneOutlinerFocusRequest } from '../scene-panel.types'
import { useOverlayProps } from './use-overlay-props'

function createFurnitureItem(id: string): FurnitureItem {
  return {
    id,
    catalogId: 'catalog-chair',
    name: `Chair ${id}`,
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [0, 0, 0],
    rotationY: 0,
  }
}

interface OverlayOptions {
  assetError: boolean
  startupLoadingActive: boolean
  startupOverlayActive: boolean
  onRetryAssetLoading: () => void
  historyAvailability: { canUndo: boolean; canRedo: boolean }
  onUndo: () => void
  onRedo: () => void
  focusRequest: SceneOutlinerFocusRequest | null
  onFocusHandled: () => void
  onSelectById: (id: string | null) => void
  readModel: SceneReadModel
  sceneInteractionsDisabled: boolean
  selectedFurniture: FurnitureItem | null
  onMoveSelection: () => { ok: true; position: [number, number, number] }
  onOpenDeleteDialog: () => void
  onRotateSelection: () => void
  catalogIdToAdd: string
  isCatalogDrawerOpen: boolean
  onAddFurniture: () => boolean
  onCatalogIdToAddChange: (catalogId: string) => void
  onCatalogDrawerOpenChange: (open: boolean) => void
  isDeleteDialogOpen: boolean
  pendingDeleteFurniture: FurnitureItem | null
  onCloseDeleteDialog: () => void
  onConfirmDeleteSelection: () => void
  isInfoDialogOpen: boolean
  onInfoDialogOpenChange: (open: boolean) => void
}

function createOptions(overrides?: Partial<OverlayOptions>): OverlayOptions {
  const selectedFurniture = createFurnitureItem('item-1')

  return {
    assetError: false,
    startupLoadingActive: false,
    startupOverlayActive: false,
    onRetryAssetLoading: vi.fn(),
    historyAvailability: { canUndo: false, canRedo: false },
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    focusRequest: null,
    onFocusHandled: vi.fn(),
    onSelectById: vi.fn(),
    readModel: {
      selectedId: selectedFurniture.id,
      items: [selectedFurniture],
    },
    sceneInteractionsDisabled: false,
    selectedFurniture,
    onMoveSelection: vi.fn(() => ({
      ok: true as const,
      position: [0, 0, 0] as [number, number, number],
    })),
    onOpenDeleteDialog: vi.fn(),
    onRotateSelection: vi.fn(),
    catalogIdToAdd: 'chair-1',
    isCatalogDrawerOpen: false,
    onAddFurniture: vi.fn(() => true),
    onCatalogIdToAddChange: vi.fn(),
    onCatalogDrawerOpenChange: vi.fn(),
    isDeleteDialogOpen: false,
    pendingDeleteFurniture: selectedFurniture,
    onCloseDeleteDialog: vi.fn(),
    onConfirmDeleteSelection: vi.fn(),
    isInfoDialogOpen: false,
    onInfoDialogOpenChange: vi.fn(),
    ...overrides,
  }
}

describe('useOverlayProps', () => {
  it('maps granular inputs into the expected overlay prop groups', () => {
    const options = createOptions({
      assetError: true,
      startupLoadingActive: true,
      startupOverlayActive: true,
      historyAvailability: { canUndo: true, canRedo: false },
      catalogIdToAdd: 'table-1',
      isCatalogDrawerOpen: true,
      isDeleteDialogOpen: true,
      isInfoDialogOpen: true,
      sceneInteractionsDisabled: true,
    })

    const { result } = renderHook(() => useOverlayProps(options))

    expect(result.current.startupProps).toEqual({
      assetError: true,
      startupLoadingActive: true,
      startupOverlayActive: true,
      onRetryAssetLoading: options.onRetryAssetLoading,
    })
    expect(result.current.historyProps).toEqual({
      historyAvailability: { canUndo: true, canRedo: false },
      onUndo: options.onUndo,
      onRedo: options.onRedo,
    })
    expect(result.current.sceneProps).toEqual({
      focusRequest: null,
      onFocusHandled: options.onFocusHandled,
      onSelectById: options.onSelectById,
      readModel: options.readModel,
      sceneInteractionsDisabled: true,
    })
    expect(result.current.selectionProps).toEqual({
      selectedFurniture: options.selectedFurniture,
      onMoveSelection: options.onMoveSelection,
      onOpenDeleteDialog: options.onOpenDeleteDialog,
      onRotateSelection: options.onRotateSelection,
    })
    expect(result.current.catalogProps).toEqual({
      catalogIdToAdd: 'table-1',
      isCatalogDrawerOpen: true,
      onAddFurniture: options.onAddFurniture,
      onCatalogIdToAddChange: options.onCatalogIdToAddChange,
      onCatalogDrawerOpenChange: options.onCatalogDrawerOpenChange,
    })
    expect(result.current.dialogsProps).toEqual({
      isDeleteDialogOpen: true,
      pendingDeleteFurniture: options.pendingDeleteFurniture,
      onCloseDeleteDialog: options.onCloseDeleteDialog,
      onConfirmDeleteSelection: options.onConfirmDeleteSelection,
      isInfoDialogOpen: true,
      onInfoDialogOpenChange: options.onInfoDialogOpenChange,
    })
  })

  it('keeps grouped prop references stable when inputs are unchanged', () => {
    const options = createOptions()

    const { result, rerender } = renderHook(
      ({ nextOptions }) => useOverlayProps(nextOptions),
      {
        initialProps: { nextOptions: options },
      },
    )

    const firstResult = result.current
    rerender({ nextOptions: options })

    expect(result.current).toBe(firstResult)
    expect(result.current.startupProps).toBe(firstResult.startupProps)
    expect(result.current.historyProps).toBe(firstResult.historyProps)
    expect(result.current.sceneProps).toBe(firstResult.sceneProps)
    expect(result.current.selectionProps).toBe(firstResult.selectionProps)
    expect(result.current.catalogProps).toBe(firstResult.catalogProps)
    expect(result.current.dialogsProps).toBe(firstResult.dialogsProps)
  })

  it('only updates affected prop group references when a focused input changes', () => {
    const options = createOptions()

    const { result, rerender } = renderHook(
      ({ nextOptions }) => useOverlayProps(nextOptions),
      {
        initialProps: { nextOptions: options },
      },
    )

    const firstResult = result.current
    const newFurniture = createFurnitureItem('item-2')

    rerender({
      nextOptions: {
        ...options,
        selectedFurniture: newFurniture,
        readModel: {
          selectedId: newFurniture.id,
          items: [newFurniture],
        },
      },
    })

    expect(result.current.selectionProps).not.toBe(firstResult.selectionProps)
    expect(result.current.sceneProps).not.toBe(firstResult.sceneProps)
    expect(result.current.startupProps).toBe(firstResult.startupProps)
    expect(result.current.historyProps).toBe(firstResult.historyProps)
    expect(result.current.catalogProps).toBe(firstResult.catalogProps)
    expect(result.current.dialogsProps).toBe(firstResult.dialogsProps)
  })
})
