// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSceneHandlers } from './use-scene-handlers'
import type {
  FurnitureItem,
  FurnitureKind,
} from '@/scene/objects/furniture.types'

describe('useSceneHandlers', () => {
  it('should handle adding furniture and announce success', () => {
    const mockCommands = {
      addFurniture: vi.fn(() => true),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({
        items: [
          {
            id: '1',
            name: 'Chair',
            kind: 'furniture' as FurnitureKind,
            collectionId: 'collection1',
            nodeName: 'node1',
            sourcePath: 'path/to/source',
            footprint: { x: 1, z: 1 },
            pivot: { x: 0, z: 0 },
            footprintSize: { width: 2, depth: 2 },
            catalogId: 'catalog1',
            position: [0, 0, 0] as [number, number, number],
            rotationY: 0,
          },
        ],
        selectedId: '1',
      })),
      requestOutlinerFocusByIndex: vi.fn(),
      focusRoomView: vi.fn(),
    }

    const mockAnnouncements = {
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
      clearAssertiveAnnouncement: vi.fn(),
      queueMovementAnnouncement: vi.fn(),
    }

    const mockDialogState = {
      closeDialog: vi.fn(),
      closeAllDialogs: vi.fn(),
      openDelete: vi.fn(),
      openStartOver: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      selectedSource: null,
      setSelectedSource,
      selectedFurniture: null as FurnitureItem | null,
      sceneReadModel: {
        items: [] as FurnitureItem[],
        selectedId: null as string | null,
      },
    }

    const mockStartup = {
      activeFloorFinishId: '',
      activeWallFinishId: '',
      catalog: [],
      defaultFloorFinishId: 'wood-floor',
      defaultWallFinishId: 'light-gray',
      editorInteractionsEnabled: true,
      floorFinishIds: [],
      handleAssetError: vi.fn(),
      handleAssetsReady: vi.fn(),
      retryAssetLoading: vi.fn(),
      resetEditorShellState: vi.fn(),
      restoreInitialLayout: vi.fn(),
      setFloorFinishId: vi.fn(),
      setWallFinishId: vi.fn(),
      wallFinishIds: [],
    }

    const { result, rerender } = renderHook(() =>
      useSceneHandlers({
        commands: mockCommands,
        sync: mockSync,
        announcements: mockAnnouncements,
        dialogState: mockDialogState,
        overlayState: mockOverlayState,
        startup: mockStartup,
      }),
    )

    act(() => {
      result.current.handleAddFurniture()
      const selectedItem = makeItem('1')
      mockOverlayState.selectedFurniture = selectedItem
      mockOverlayState.sceneReadModel = {
        items: [selectedItem],
        selectedId: selectedItem.id,
      }
      rerender()
    })

    expect(mockCommands.addFurniture).toHaveBeenCalled()
    expect(mockSync.syncSceneReadModel).not.toHaveBeenCalled()
    expect(setSelectedSource).toHaveBeenLastCalledWith('toolbar')
    expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
      'Test Item added to room.',
    )
  })

  it('forwards camera preset and focus actions to commands', () => {
    const mockCommands = {
      addFurniture: vi.fn(() => true),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({
        items: [],
        selectedId: null,
      })),
      requestOutlinerFocusByIndex: vi.fn(),
      focusRoomView: vi.fn(),
    }

    const mockAnnouncements = {
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
      clearAssertiveAnnouncement: vi.fn(),
      queueMovementAnnouncement: vi.fn(),
    }

    const mockDialogState = {
      closeDialog: vi.fn(),
      closeAllDialogs: vi.fn(),
      openDelete: vi.fn(),
      openStartOver: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      selectedSource: null,
      setSelectedSource: vi.fn(),
      selectedFurniture: null,
      sceneReadModel: { items: [], selectedId: null },
    }

    const mockStartup = {
      activeFloorFinishId: '',
      activeWallFinishId: '',
      catalog: [],
      defaultFloorFinishId: 'wood-floor',
      defaultWallFinishId: 'light-gray',
      editorInteractionsEnabled: true,
      floorFinishIds: [],
      handleAssetError: vi.fn(),
      handleAssetsReady: vi.fn(),
      retryAssetLoading: vi.fn(),
      resetEditorShellState: vi.fn(),
      restoreInitialLayout: vi.fn(),
      setFloorFinishId: vi.fn(),
      setWallFinishId: vi.fn(),
      wallFinishIds: [],
    }

    const { result } = renderHook(() =>
      useSceneHandlers({
        commands: mockCommands,
        sync: mockSync,
        announcements: mockAnnouncements,
        dialogState: mockDialogState,
        overlayState: mockOverlayState,
        startup: mockStartup,
      }),
    )

    act(() => {
      result.current.handleSetCameraPreset('top')
      result.current.handleFocusSelected()
    })

    expect(mockCommands.setCameraPreset).toHaveBeenCalledWith('top')
    expect(mockCommands.focusSelected).toHaveBeenCalledOnce()
  })

  const makeItem = (id: string) => ({
    id,
    catalogId: 'test',
    name: 'Test Item',
    kind: 'armchair' as const,
    collectionId: 'test',
    nodeName: 'test',
    sourcePath: 'test',
    footprintSize: { width: 1, depth: 1 },
    position: [0, 0, 0] as [number, number, number],
    rotationY: 0,
  })

  it('rotates the current selection without forcing a read-model sync', () => {
    const selectedFurniture = makeItem('item-1')
    const mockCommands = {
      addFurniture: vi.fn(() => true),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({
        items: [selectedFurniture],
        selectedId: selectedFurniture.id,
      })),
      requestOutlinerFocusByIndex: vi.fn(),
      focusRoomView: vi.fn(),
    }

    const mockAnnouncements = {
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
      clearAssertiveAnnouncement: vi.fn(),
      queueMovementAnnouncement: vi.fn(),
    }

    const mockDialogState = {
      closeDialog: vi.fn(),
      closeAllDialogs: vi.fn(),
      openDelete: vi.fn(),
      openStartOver: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      selectedSource: null,
      setSelectedSource: vi.fn(),
      selectedFurniture,
      sceneReadModel: {
        items: [selectedFurniture],
        selectedId: selectedFurniture.id,
      },
    }

    const mockStartup = {
      activeFloorFinishId: '',
      activeWallFinishId: '',
      catalog: [],
      defaultFloorFinishId: 'wood-floor',
      defaultWallFinishId: 'light-gray',
      editorInteractionsEnabled: true,
      floorFinishIds: [],
      handleAssetError: vi.fn(),
      handleAssetsReady: vi.fn(),
      retryAssetLoading: vi.fn(),
      resetEditorShellState: vi.fn(),
      restoreInitialLayout: vi.fn(),
      setFloorFinishId: vi.fn(),
      setWallFinishId: vi.fn(),
      wallFinishIds: [],
    }

    const { result } = renderHook(() =>
      useSceneHandlers({
        commands: mockCommands,
        sync: mockSync,
        announcements: mockAnnouncements,
        dialogState: mockDialogState,
        overlayState: mockOverlayState,
        startup: mockStartup,
      }),
    )

    act(() => {
      result.current.handleRotateSelection(1)
    })

    expect(mockCommands.rotateSelection).toHaveBeenCalledWith(1)
    expect(mockSync.syncSceneReadModel).not.toHaveBeenCalled()
    expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
      'Test Item rotated.',
    )
  })

  it('announces movement from the command result without forcing a read-model sync', () => {
    const selectedFurniture = makeItem('item-1')
    const mockCommands = {
      addFurniture: vi.fn(() => true),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(() => ({
        ok: true as const,
        position: [1.5, 0, -2.25] as [number, number, number],
      })),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({
        items: [selectedFurniture],
        selectedId: selectedFurniture.id,
      })),
      requestOutlinerFocusByIndex: vi.fn(),
      focusRoomView: vi.fn(),
    }

    const mockAnnouncements = {
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
      clearAssertiveAnnouncement: vi.fn(),
      queueMovementAnnouncement: vi.fn(),
    }

    const mockDialogState = {
      closeDialog: vi.fn(),
      closeAllDialogs: vi.fn(),
      openDelete: vi.fn(),
      openStartOver: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      selectedSource: null,
      setSelectedSource: vi.fn(),
      selectedFurniture,
      sceneReadModel: {
        items: [selectedFurniture],
        selectedId: selectedFurniture.id,
      },
    }

    const mockStartup = {
      activeFloorFinishId: '',
      activeWallFinishId: '',
      catalog: [],
      defaultFloorFinishId: 'wood-floor',
      defaultWallFinishId: 'light-gray',
      editorInteractionsEnabled: true,
      floorFinishIds: [],
      handleAssetError: vi.fn(),
      handleAssetsReady: vi.fn(),
      retryAssetLoading: vi.fn(),
      resetEditorShellState: vi.fn(),
      restoreInitialLayout: vi.fn(),
      setFloorFinishId: vi.fn(),
      setWallFinishId: vi.fn(),
      wallFinishIds: [],
    }

    const { result } = renderHook(() =>
      useSceneHandlers({
        commands: mockCommands,
        sync: mockSync,
        announcements: mockAnnouncements,
        dialogState: mockDialogState,
        overlayState: mockOverlayState,
        startup: mockStartup,
      }),
    )

    let moveResult:
      | ReturnType<typeof result.current.handleMoveSelection>
      | undefined

    act(() => {
      moveResult = result.current.handleMoveSelection({ x: 1.5, z: -2.25 })
    })

    expect(mockCommands.moveSelection).toHaveBeenCalledWith(
      { x: 1.5, z: -2.25 },
      undefined,
    )
    expect(mockSync.syncSceneReadModel).not.toHaveBeenCalled()
    expect(mockAnnouncements.queueMovementAnnouncement).toHaveBeenCalledWith(
      'Test Item moved to X 1.5 meters and Z -2.3 meters.',
    )
    expect(moveResult).toEqual({
      ok: true,
      position: [1.5, 0, -2.25],
    })
  })

  it('returns focus to room view when delete is initiated from room view', () => {
    const item = makeItem('item-1')
    const mockCommands = {
      addFurniture: vi.fn(),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(() => true),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const focusRoomView = vi.fn()
    const requestOutlinerFocusByIndex = vi.fn()
    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({ items: [], selectedId: null })),
      requestOutlinerFocusByIndex,
      focusRoomView,
    }

    const mockAnnouncements = {
      announcePolite: vi.fn(),
      announceAssertive: vi.fn(),
      clearAssertiveAnnouncement: vi.fn(),
      queueMovementAnnouncement: vi.fn(),
    }

    const mockDialogState = {
      closeDialog: vi.fn(),
      closeAllDialogs: vi.fn(),
      openDelete: vi.fn(() => true),
      openStartOver: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: item,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      selectedSource: 'panel-pointer' as const,
      setSelectedSource: vi.fn(),
      selectedFurniture: item,
      sceneReadModel: { items: [item], selectedId: item.id },
    }

    const mockStartup = {
      activeFloorFinishId: '',
      activeWallFinishId: '',
      catalog: [],
      defaultFloorFinishId: 'wood-floor',
      defaultWallFinishId: 'light-gray',
      editorInteractionsEnabled: true,
      floorFinishIds: [],
      handleAssetError: vi.fn(),
      handleAssetsReady: vi.fn(),
      retryAssetLoading: vi.fn(),
      resetEditorShellState: vi.fn(),
      restoreInitialLayout: vi.fn(),
      setFloorFinishId: vi.fn(),
      setWallFinishId: vi.fn(),
      wallFinishIds: [],
    }

    const { result } = renderHook(() =>
      useSceneHandlers({
        commands: mockCommands,
        sync: mockSync,
        announcements: mockAnnouncements,
        dialogState: mockDialogState,
        overlayState: mockOverlayState,
        startup: mockStartup,
      }),
    )

    act(() => {
      result.current.handleOpenDeleteDialogFromRoomView()
      result.current.handleConfirmDeleteSelection()
    })

    expect(focusRoomView).toHaveBeenCalledOnce()
    expect(requestOutlinerFocusByIndex).not.toHaveBeenCalled()
  })
})
