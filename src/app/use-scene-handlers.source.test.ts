// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSceneHandlers } from './use-scene-handlers'
import { selectionMetaActions } from '@/editor-state/selection-meta-store'

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

type TestItem = ReturnType<typeof makeItem>

function applySceneSelection(
  mockOverlayState: {
    selectedFurniture: TestItem | null
    sceneReadModel: { items: TestItem[]; selectedId: string | null }
  },
  rerender: () => void,
  item: TestItem | null,
) {
  mockOverlayState.selectedFurniture = item
  mockOverlayState.sceneReadModel = {
    items: item ? [item] : [],
    selectedId: item?.id ?? null,
  }
  rerender()
}

describe('useSceneHandlers', () => {
  it('commits typed selected item details through the shared transform command', () => {
    const selectedFurniture = makeItem('1')
    const updatedFurniture = {
      ...selectedFurniture,
      position: [1.2, 0, 0] as [number, number, number],
    }
    const mockCommands = {
      addFurniture: vi.fn(() => true),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      setSelectionTransform: vi.fn(() => ({
        ok: true as const,
        item: updatedFurniture,
      })),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({
        items: [updatedFurniture],
        selectedId: updatedFurniture.id,
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

    let updateResult:
      | ReturnType<typeof result.current.handleUpdateSelectedItemDetails>
      | undefined

    act(() => {
      updateResult = result.current.handleUpdateSelectedItemDetails({
        field: 'positionX',
        fieldLabel: 'Distance from left wall (m)',
        value: 1.2,
      })
    })

    expect(mockCommands.setSelectionTransform).toHaveBeenCalledWith({
      position: [-1.3, 0, 0],
      rotationY: undefined,
    })
    expect(setSelectedSource).toHaveBeenCalledWith('panel-keyboard')
    expect(mockSync.syncSceneReadModel).not.toHaveBeenCalled()
    expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
      'Test Item details updated.',
    )
    expect(updateResult).toEqual({ ok: true, item: updatedFurniture })
  })

  it('keeps undo completion announcements from being overwritten by selection-loss copy', () => {
    selectionMetaActions.clearOutlinerFocusRequest()

    const selectedFurniture = makeItem('1')
    const mockCommands = {
      addFurniture: vi.fn(() => true),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      setSelectionTransform: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(),
      setCameraPreset: vi.fn(),
      undo: vi.fn(() => true),
    }

    const mockSync = {
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
      result.current.handleUndo()
      applySceneSelection(mockOverlayState, rerender, null)
    })

    expect(mockAnnouncements.announcePolite).toHaveBeenCalledTimes(1)
    expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
      'Undo complete.',
    )

    selectionMetaActions.clearOutlinerFocusRequest()
  })

  it('maps blocked typed detail edits to field-specific error copy', () => {
    const selectedFurniture = makeItem('1')
    const mockCommands = {
      addFurniture: vi.fn(() => true),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      setSelectionTransform: vi.fn(() => ({
        ok: false as const,
        reason: 'blocked-bounds' as const,
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

    let updateResult:
      | ReturnType<typeof result.current.handleUpdateSelectedItemDetails>
      | undefined

    act(() => {
      updateResult = result.current.handleUpdateSelectedItemDetails({
        field: 'positionX',
        fieldLabel: 'Distance from left wall (m)',
        value: 3,
      })
    })

    expect(mockOverlayState.setEditorMessage).not.toHaveBeenCalled()
    expect(mockAnnouncements.announceAssertive).not.toHaveBeenCalled()
    expect(updateResult).toEqual({
      ok: false,
      reason: 'blocked-bounds',
      message: 'Distance from left wall (m) must stay inside the room.',
    })
  })

  it('converts clockwise-positive detail rotation input back to scene radians', () => {
    const selectedFurniture = makeItem('1')
    const updatedFurniture = {
      ...selectedFurniture,
      rotationY: (23 * Math.PI) / 12,
    }
    const setSelectedSource = vi.fn()
    const mockCommands = {
      addFurniture: vi.fn(() => true),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      setSelectionTransform: vi.fn(() => ({
        ok: true as const,
        item: updatedFurniture,
      })),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({
        items: [updatedFurniture],
        selectedId: updatedFurniture.id,
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
      setSelectedSource,
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
      result.current.handleUpdateSelectedItemDetails({
        field: 'rotationDegrees',
        fieldLabel: 'Rotation (deg)',
        value: 15,
      })
    })

    expect(mockCommands.setSelectionTransform).toHaveBeenCalledTimes(1)
    const transformCalls = mockCommands.setSelectionTransform.mock
      .calls as unknown as [
      {
        position?: [number, number, number]
        rotationY?: number
      },
    ][]
    const firstTransformCall = transformCalls[0]?.[0]

    expect(firstTransformCall).toMatchObject({
      position: undefined,
    })
    expect(firstTransformCall.rotationY).toBeCloseTo((23 * Math.PI) / 12)
    expect(setSelectedSource).toHaveBeenCalledWith('panel-keyboard')
  })

  it('announces invalid typed detail values with field-specific copy', () => {
    const selectedFurniture = makeItem('1')
    const clearEditorMessage = vi.fn()
    const setEditorMessage = vi.fn()
    const announceAssertive = vi.fn()
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
      announceAssertive,
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
      clearEditorMessage,
      setEditorMessage,
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

    let message = ''

    act(() => {
      message = result.current.handleInvalidSelectedItemDetailValue(
        'Distance from left wall (m)',
      )
    })

    expect(message).toBe('Distance from left wall (m) must be a valid number.')
    expect(clearEditorMessage).not.toHaveBeenCalled()
    expect(setEditorMessage).not.toHaveBeenCalled()
    expect(announceAssertive).not.toHaveBeenCalled()
  })

  it('sets selectedSource to canvas-pointer for canvas pointer selections', () => {
    const mockCommands = {
      addFurniture: vi.fn(),
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
      syncSceneReadModel: vi.fn(() => ({ items: [], selectedId: null })),
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
      result.current.handleCanvasPointerSelection('item-1')
      applySceneSelection(mockOverlayState, rerender, makeItem('item-1'))
    })

    expect(setSelectedSource).toHaveBeenLastCalledWith('canvas-pointer')
  })

  it('does not update selectedSource when selectedId rerenders with the same item id (e.g. position update)', () => {
    const mockCommands = {
      addFurniture: vi.fn(),
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
      syncSceneReadModel: vi.fn(() => ({ items: [], selectedId: null })),
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
      result.current.handleCanvasPointerSelection('item-1')
      applySceneSelection(mockOverlayState, rerender, makeItem('item-1'))
    })
    expect(setSelectedSource).toHaveBeenCalledTimes(2)

    setSelectedSource.mockClear()

    act(() => {
      applySceneSelection(mockOverlayState, rerender, makeItem('item-1'))
    })

    expect(setSelectedSource).not.toHaveBeenCalled()
  })

  it('clears selectedSource when selectedId rerenders to no selection', () => {
    const mockCommands = {
      addFurniture: vi.fn(),
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
      syncSceneReadModel: vi.fn(() => ({ items: [], selectedId: null })),
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
      selectedSource: 'canvas-pointer' as const,
      setSelectedSource,
      selectedFurniture: makeItem('item-1'),
      sceneReadModel: { items: [makeItem('item-1')], selectedId: 'item-1' },
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
      result.current.handleCanvasPointerSelection('item-1')
      applySceneSelection(mockOverlayState, rerender, makeItem('item-1'))
    })
    setSelectedSource.mockClear()

    act(() => {
      applySceneSelection(mockOverlayState, rerender, null)
    })

    expect(setSelectedSource).toHaveBeenCalledWith(null)
  })

  it('preserves programmatic selectedSource when handleSelectById fires before selectedId rerenders', () => {
    const mockCommands = {
      addFurniture: vi.fn(),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(() => ({
        ok: true as const,
        status: 'selected' as const,
      })),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({ items: [], selectedId: null })),
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
      result.current.handleSelectById('item-1', 'canvas-keyboard')
      applySceneSelection(mockOverlayState, rerender, makeItem('item-1'))
    })

    const sourceCalls = setSelectedSource.mock.calls.map((c: unknown[]) => c[0])
    expect(sourceCalls).toContain('canvas-keyboard')
    expect(sourceCalls[sourceCalls.length - 1]).toBe('canvas-keyboard')
  })

  it('clears pending source when handleSelectById fails so later canvas selection stays canvas-pointer', () => {
    const mockCommands = {
      addFurniture: vi.fn(),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(() => ({
        ok: false as const,
        status: 'not-found' as const,
      })),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({ items: [], selectedId: null })),
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
      result.current.handleSelectById('missing-id', 'panel-pointer')
    })
    setSelectedSource.mockClear()

    act(() => {
      result.current.handleCanvasPointerSelection('item-1')
      applySceneSelection(mockOverlayState, rerender, makeItem('item-1'))
    })

    expect(setSelectedSource).toHaveBeenCalledTimes(2)
    expect(setSelectedSource).toHaveBeenLastCalledWith('canvas-pointer')
  })

  it('clears pending source on same-id selectById no-op so later canvas selection is not misattributed', () => {
    const mockCommands = {
      addFurniture: vi.fn(),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(() => ({
        ok: true as const,
        status: 'selected' as const,
      })),
      setCameraPreset: vi.fn(),
      undo: vi.fn(),
    }

    const mockSync = {
      syncSceneReadModel: vi.fn(() => ({ items: [], selectedId: 'item-1' })),
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
      selectedFurniture: makeItem('item-1'),
      sceneReadModel: { items: [makeItem('item-1')], selectedId: 'item-1' },
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
      result.current.handleSelectById('item-1', 'panel-pointer')
    })
    setSelectedSource.mockClear()

    act(() => {
      result.current.handleCanvasPointerSelection('item-2')
      applySceneSelection(mockOverlayState, rerender, makeItem('item-2'))
    })

    expect(setSelectedSource).toHaveBeenCalledTimes(2)
    expect(setSelectedSource).toHaveBeenLastCalledWith('canvas-pointer')
  })

  it('announces the Shift+Tab hint for panel-keyboard selection', () => {
    const selectedFurniture = makeItem('item-1')
    const mockCommands = {
      addFurniture: vi.fn(),
      clearSelection: vi.fn(),
      confirmDeleteSelection: vi.fn(),
      focusSelected: vi.fn(),
      moveSelection: vi.fn(),
      redo: vi.fn(),
      rotateSelection: vi.fn(),
      selectById: vi.fn(() => ({
        ok: true as const,
        status: 'selected' as const,
      })),
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
      result.current.handleSelectById('item-1', 'panel-keyboard')
      applySceneSelection(mockOverlayState, rerender, selectedFurniture)
    })

    expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
      'Test Item selected. Press Shift+Tab to reach selected item actions and details.',
    )
  })

  it('marks same-id canvas clicks as canvas-pointer without leaking pending source', () => {
    const mockCommands = {
      addFurniture: vi.fn(),
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
      syncSceneReadModel: vi.fn(() => ({ items: [], selectedId: 'item-1' })),
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
      selectedSource: 'panel-pointer' as const,
      setSelectedSource,
      selectedFurniture: makeItem('item-1'),
      sceneReadModel: { items: [makeItem('item-1')], selectedId: 'item-1' },
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
      result.current.handleCanvasPointerSelection('item-1')
    })

    expect(setSelectedSource).toHaveBeenLastCalledWith('canvas-pointer')

    setSelectedSource.mockClear()

    act(() => {
      applySceneSelection(mockOverlayState, rerender, makeItem('item-2'))
    })

    expect(setSelectedSource).toHaveBeenCalledWith(null)
  })
})
