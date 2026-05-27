// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { runStartupRestoreFlow, useSceneHandlers } from './use-scene-handlers'
import type { FurnitureKind } from '@/scene/objects/furniture.types'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'

function setNavigatorValue(name: string, value: unknown) {
  Object.defineProperty(window.navigator, name, {
    configurable: true,
    writable: true,
    value,
  })
}

function restoreNavigatorValue(
  name: string,
  descriptor: PropertyDescriptor | undefined,
) {
  if (descriptor) {
    Object.defineProperty(window.navigator, name, descriptor)
    return
  }

  Reflect.deleteProperty(window.navigator, name)
}

function createCatalogEntry(id: string): FurnitureCatalogEntry {
  return {
    id,
    name: `Item ${id}`,
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'node-1',
    footprintSize: { width: 1, depth: 1 },
    previewPath: '/preview.png',
  }
}

function createState(id: string) {
  return {
    items: [
      {
        id: `${id}-instance-1`,
        catalogId: id,
        position: [0, 0, 0] as [number, number, number],
        rotationY: 0,
      },
    ],
    floorFinishId: 'floor-1',
    wallFinishId: 'wall-1',
  }
}

function createNotificationsSpies() {
  const calls = {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    setEditorMessage: vi.fn(),
    setRestoreOutcome: vi.fn(),
    toastSuccess: vi.fn(),
    toastWarning: vi.fn(),
    toastError: vi.fn(),
  }

  return {
    calls,
    notifications: {
      announcePolite: calls.announcePolite,
      announceAssertive: calls.announceAssertive,
      setEditorMessage: calls.setEditorMessage,
      setRestoreOutcome: calls.setRestoreOutcome,
      toastSuccess: calls.toastSuccess,
      toastWarning: calls.toastWarning,
      toastError: calls.toastError,
    },
  }
}

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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      result.current.handleAddFurniture()
      result.current.handleSceneSelectionChange(makeItem('1'))
    })

    expect(mockCommands.addFurniture).toHaveBeenCalled()
    expect(mockSync.syncSceneReadModel).toHaveBeenCalled()
    expect(setSelectedSource).toHaveBeenLastCalledWith('toolbar')
    expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
      'Chair added to room.',
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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

  function createShareHandlersHarness() {
    const sceneItem = makeItem('shareable-item')
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
        items: [sceneItem],
        selectedId: sceneItem.id,
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
      selectedSource: null,
      setSelectedSource: vi.fn(),
      selectedFurniture: sceneItem,
      sceneReadModel: { items: [sceneItem], selectedId: sceneItem.id },
    }

    const mockStartup = {
      activeFloorFinishId: 'wood-floor',
      activeWallFinishId: 'light-gray',
      catalog: [],
      defaultFloorFinishId: 'wood-floor',
      defaultWallFinishId: 'light-gray',
      editorInteractionsEnabled: true,
      floorFinishIds: ['wood-floor'],
      handleAssetError: vi.fn(),
      handleAssetsReady: vi.fn(),
      retryAssetLoading: vi.fn(),
      resetEditorShellState: vi.fn(),
      restoreInitialLayout: vi.fn(),
      setFloorFinishId: vi.fn(),
      setWallFinishId: vi.fn(),
      wallFinishIds: ['light-gray'],
    }

    const hook = renderHook(() =>
      useSceneHandlers({
        commands: mockCommands,
        sync: mockSync,
        announcements: mockAnnouncements,
        dialogState: mockDialogState,
        overlayState: mockOverlayState,
        startup: mockStartup,
      }),
    )

    return {
      hook,
      mockAnnouncements,
      mockOverlayState,
    }
  }

  it('uses native share when the browser supports sharing URLs', async () => {
    const originalShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'share',
    )
    const originalCanShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'canShare',
    )
    const originalClipboard = Object.getOwnPropertyDescriptor(
      window.navigator,
      'clipboard',
    )
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)

    setNavigatorValue('share', share)
    setNavigatorValue(
      'canShare',
      vi.fn(() => true),
    )
    setNavigatorValue('clipboard', { writeText })

    try {
      const { hook, mockAnnouncements, mockOverlayState } =
        createShareHandlersHarness()

      let shareResult: Awaited<
        ReturnType<typeof hook.result.current.handleShareSceneUrl>
      > = null

      await act(async () => {
        shareResult = await hook.result.current.handleShareSceneUrl()
      })

      expect(shareResult).toBe('shared')
      expect(share).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Room Layout' }),
      )
      expect(writeText).not.toHaveBeenCalled()
      expect(mockOverlayState.clearEditorMessage).toHaveBeenCalled()
      expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
        'Room layout shared.',
      )
    } finally {
      restoreNavigatorValue('share', originalShare)
      restoreNavigatorValue('canShare', originalCanShare)
      restoreNavigatorValue('clipboard', originalClipboard)
    }
  })

  it('falls back to copying the scene URL when canShare rejects the URL', async () => {
    const originalShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'share',
    )
    const originalCanShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'canShare',
    )
    const originalClipboard = Object.getOwnPropertyDescriptor(
      window.navigator,
      'clipboard',
    )
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)

    setNavigatorValue('share', share)
    setNavigatorValue(
      'canShare',
      vi.fn(() => false),
    )
    setNavigatorValue('clipboard', { writeText })

    try {
      const { hook, mockAnnouncements, mockOverlayState } =
        createShareHandlersHarness()

      let shareResult: Awaited<
        ReturnType<typeof hook.result.current.handleShareSceneUrl>
      > = null

      await act(async () => {
        shareResult = await hook.result.current.handleShareSceneUrl()
      })

      expect(shareResult).toBe('copied')
      expect(share).not.toHaveBeenCalled()
      expect(writeText).toHaveBeenCalledOnce()
      expect(mockOverlayState.clearEditorMessage).toHaveBeenCalled()
      expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
        'Scene URL copied to clipboard.',
      )
    } finally {
      restoreNavigatorValue('share', originalShare)
      restoreNavigatorValue('canShare', originalCanShare)
      restoreNavigatorValue('clipboard', originalClipboard)
    }
  })

  it('falls back to copying the scene URL when native share is unavailable', async () => {
    const originalShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'share',
    )
    const originalCanShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'canShare',
    )
    const originalClipboard = Object.getOwnPropertyDescriptor(
      window.navigator,
      'clipboard',
    )
    const writeText = vi.fn().mockResolvedValue(undefined)

    setNavigatorValue('share', undefined)
    setNavigatorValue('canShare', undefined)
    setNavigatorValue('clipboard', { writeText })

    try {
      const { hook, mockAnnouncements, mockOverlayState } =
        createShareHandlersHarness()

      let shareResult: Awaited<
        ReturnType<typeof hook.result.current.handleShareSceneUrl>
      > = null

      await act(async () => {
        shareResult = await hook.result.current.handleShareSceneUrl()
      })

      expect(shareResult).toBe('copied')
      expect(writeText).toHaveBeenCalledOnce()
      expect(mockOverlayState.clearEditorMessage).toHaveBeenCalled()
      expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
        'Scene URL copied to clipboard.',
      )
    } finally {
      restoreNavigatorValue('share', originalShare)
      restoreNavigatorValue('canShare', originalCanShare)
      restoreNavigatorValue('clipboard', originalClipboard)
    }
  })

  it('treats user-cancelled native sharing as a silent no-op', async () => {
    const originalShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'share',
    )
    const originalCanShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'canShare',
    )
    const originalClipboard = Object.getOwnPropertyDescriptor(
      window.navigator,
      'clipboard',
    )
    const share = vi
      .fn()
      .mockRejectedValue(new DOMException('User aborted share', 'AbortError'))
    const writeText = vi.fn().mockResolvedValue(undefined)

    setNavigatorValue('share', share)
    setNavigatorValue(
      'canShare',
      vi.fn(() => true),
    )
    setNavigatorValue('clipboard', { writeText })

    try {
      const { hook, mockAnnouncements, mockOverlayState } =
        createShareHandlersHarness()

      let shareResult: Awaited<
        ReturnType<typeof hook.result.current.handleShareSceneUrl>
      > = null

      await act(async () => {
        shareResult = await hook.result.current.handleShareSceneUrl()
      })

      expect(shareResult).toBeNull()
      expect(writeText).not.toHaveBeenCalled()
      expect(mockOverlayState.clearEditorMessage).not.toHaveBeenCalled()
      expect(mockAnnouncements.announcePolite).not.toHaveBeenCalled()
      expect(mockAnnouncements.announceAssertive).not.toHaveBeenCalled()
    } finally {
      restoreNavigatorValue('share', originalShare)
      restoreNavigatorValue('canShare', originalCanShare)
      restoreNavigatorValue('clipboard', originalClipboard)
    }
  })

  it('reports native share failures that are not user cancellation', async () => {
    const originalShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'share',
    )
    const originalCanShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'canShare',
    )
    const originalClipboard = Object.getOwnPropertyDescriptor(
      window.navigator,
      'clipboard',
    )
    const share = vi
      .fn()
      .mockRejectedValue(
        new DOMException('Already sharing', 'InvalidStateError'),
      )
    const writeText = vi.fn().mockResolvedValue(undefined)

    setNavigatorValue('share', share)
    setNavigatorValue(
      'canShare',
      vi.fn(() => true),
    )
    setNavigatorValue('clipboard', { writeText })

    try {
      const { hook, mockAnnouncements, mockOverlayState } =
        createShareHandlersHarness()

      let shareResult: Awaited<
        ReturnType<typeof hook.result.current.handleShareSceneUrl>
      > = null

      await act(async () => {
        shareResult = await hook.result.current.handleShareSceneUrl()
      })

      expect(shareResult).toBeNull()
      expect(writeText).not.toHaveBeenCalled()
      expect(mockOverlayState.setEditorMessage).toHaveBeenCalledWith(
        'Could not open share options.',
      )
      expect(mockAnnouncements.announceAssertive).toHaveBeenCalledWith(
        'Could not open share options.',
      )
    } finally {
      restoreNavigatorValue('share', originalShare)
      restoreNavigatorValue('canShare', originalCanShare)
      restoreNavigatorValue('clipboard', originalClipboard)
    }
  })

  it('falls back to copying the scene URL when canShare throws', async () => {
    const originalShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'share',
    )
    const originalCanShare = Object.getOwnPropertyDescriptor(
      window.navigator,
      'canShare',
    )
    const originalClipboard = Object.getOwnPropertyDescriptor(
      window.navigator,
      'clipboard',
    )
    const share = vi.fn().mockResolvedValue(undefined)
    const writeText = vi.fn().mockResolvedValue(undefined)

    setNavigatorValue('share', share)
    setNavigatorValue(
      'canShare',
      vi.fn(() => {
        throw new DOMException('bad share data', 'TypeError')
      }),
    )
    setNavigatorValue('clipboard', { writeText })

    try {
      const { hook, mockAnnouncements, mockOverlayState } =
        createShareHandlersHarness()

      let shareResult: Awaited<
        ReturnType<typeof hook.result.current.handleShareSceneUrl>
      > = null

      await act(async () => {
        shareResult = await hook.result.current.handleShareSceneUrl()
      })

      expect(shareResult).toBe('copied')
      expect(share).not.toHaveBeenCalled()
      expect(writeText).toHaveBeenCalledOnce()
      expect(mockOverlayState.clearEditorMessage).toHaveBeenCalled()
      expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
        'Scene URL copied to clipboard.',
      )
    } finally {
      restoreNavigatorValue('share', originalShare)
      restoreNavigatorValue('canShare', originalCanShare)
      restoreNavigatorValue('clipboard', originalClipboard)
    }
  })

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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
    expect(mockSync.syncSceneReadModel).toHaveBeenCalledWith({
      requestOutlinerFocus: false,
    })
    expect(mockAnnouncements.announcePolite).toHaveBeenCalledWith(
      'Test Item details updated.',
    )
    expect(updateResult).toEqual({ ok: true, item: updatedFurniture })
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage,
      setEditorMessage,
      handleHistoryChange: vi.fn(),
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      result.current.handleCanvasPointerSelection('item-1')
      result.current.handleSceneSelectionChange(makeItem('item-1'))
    })

    expect(setSelectedSource).toHaveBeenLastCalledWith('canvas-pointer')
  })

  it('does not update selectedSource when handleSceneSelectionChange fires with same item id (e.g. position update)', () => {
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      result.current.handleCanvasPointerSelection('item-1')
      result.current.handleSceneSelectionChange(makeItem('item-1'))
    })
    expect(setSelectedSource).toHaveBeenCalledTimes(2)

    setSelectedSource.mockClear()

    // Second call with a different object but same id (simulates position update)
    act(() => {
      result.current.handleSceneSelectionChange(makeItem('item-1'))
    })

    // No additional setSelectedSource call should have happened
    expect(setSelectedSource).not.toHaveBeenCalled()
  })

  it('clears selectedSource when handleSceneSelectionChange clears selection', () => {
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      result.current.handleCanvasPointerSelection('item-1')
      result.current.handleSceneSelectionChange(makeItem('item-1'))
    })
    setSelectedSource.mockClear()

    act(() => {
      result.current.handleSceneSelectionChange(null)
    })

    expect(setSelectedSource).toHaveBeenCalledWith(null)
  })

  it('preserves programmatic selectedSource when handleSelectById fires before handleSceneSelectionChange', () => {
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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

    // Simulate programmatic selection via canvas-keyboard followed by the
    // scene's onSelectionChange callback firing.
    act(() => {
      result.current.handleSelectById('item-1', 'canvas-keyboard')
      result.current.handleSceneSelectionChange(makeItem('item-1'))
    })

    // The pending source should have been consumed and the second call should
    // use 'canvas-keyboard', not default to 'canvas-pointer'.
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      result.current.handleSelectById('missing-id', 'panel-pointer')
    })
    setSelectedSource.mockClear()

    act(() => {
      result.current.handleCanvasPointerSelection('item-1')
      result.current.handleSceneSelectionChange(makeItem('item-1'))
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      result.current.handleSelectById('item-1', 'panel-pointer')
    })
    setSelectedSource.mockClear()

    act(() => {
      result.current.handleCanvasPointerSelection('item-2')
      result.current.handleSceneSelectionChange(makeItem('item-2'))
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      result.current.handleSelectById('item-1', 'panel-keyboard')
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: null,
    }

    const setSelectedSource = vi.fn()
    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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
      result.current.handleCanvasPointerSelection('item-1')
    })

    expect(setSelectedSource).toHaveBeenLastCalledWith('canvas-pointer')

    setSelectedSource.mockClear()

    act(() => {
      result.current.handleSceneSelectionChange(makeItem('item-2'))
    })

    expect(setSelectedSource).toHaveBeenCalledWith(null)
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
      openNewScene: vi.fn(),
      setCatalogOpen: vi.fn(),
      pendingDeleteFurniture: item,
    }

    const mockOverlayState = {
      clearPreview: vi.fn(),
      clearEditorMessage: vi.fn(),
      setEditorMessage: vi.fn(),
      handleHistoryChange: vi.fn(),
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

describe('runStartupRestoreFlow', () => {
  it('restores from valid scene param and reports success channels', () => {
    const parsed = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const { calls, notifications } = createNotificationsSpies()

    runStartupRestoreFlow({
      parseResult: { ok: true, ...parsed },
      catalog,
      validDraftState: null,
      applyState,
      notifications,
    })

    expect(applyState).toHaveBeenCalledWith({ ok: true, ...parsed })
    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('restored')
    expect(calls.announcePolite).toHaveBeenCalledWith(
      'Room layout restored from shared link.',
    )
    expect(calls.toastSuccess).toHaveBeenCalledWith(
      'Room layout restored from shared link.',
    )
    expect(calls.announceAssertive).not.toHaveBeenCalled()
    expect(calls.setEditorMessage).not.toHaveBeenCalled()
  })

  it('falls back to valid draft when parsed scene restore throws', () => {
    const parsed = createState('chair-1')
    const draft = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi
      .fn<(state: { items: unknown[] }) => void>()
      .mockImplementationOnce(() => {
        throw new Error('parsed restore failed')
      })
      .mockImplementationOnce(() => undefined)
    const { calls, notifications } = createNotificationsSpies()

    runStartupRestoreFlow({
      parseResult: { ok: true, ...parsed },
      catalog,
      validDraftState: draft,
      applyState,
      notifications,
    })

    expect(applyState).toHaveBeenCalledTimes(2)
    expect(applyState).toHaveBeenNthCalledWith(2, draft)
    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('invalid')
    expect(calls.setEditorMessage).toHaveBeenCalledWith(
      'Shared link could not be restored. Recovered your local draft.',
    )
    expect(calls.announceAssertive).toHaveBeenCalledWith(
      'Shared link could not be restored. Recovered your local draft.',
    )
    expect(calls.toastWarning).toHaveBeenCalledWith(
      'Shared link was invalid. Recovered your local draft.',
    )
  })

  it('reports blocking error when scene param is malformed and no draft exists', () => {
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const { calls, notifications } = createNotificationsSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'decode-error' },
      catalog,
      validDraftState: null,
      applyState,
      notifications,
    })

    expect(applyState).not.toHaveBeenCalled()
    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('invalid')
    expect(calls.setEditorMessage).toHaveBeenCalledWith(
      'Shared link could not be restored. Starting with an empty room.',
    )
    expect(calls.announceAssertive).toHaveBeenCalledWith(
      'Shared link could not be restored. Starting with an empty room.',
    )
    expect(calls.toastError).toHaveBeenCalledWith(
      'Shared link could not be restored.',
    )
  })

  it('falls back to draft when parsed scene has unknown catalog IDs', () => {
    const parsed = createState('unknown-catalog-id')
    const draft = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const { calls, notifications } = createNotificationsSpies()

    runStartupRestoreFlow({
      parseResult: { ok: true, ...parsed },
      catalog,
      validDraftState: draft,
      applyState,
      notifications,
    })

    expect(applyState).toHaveBeenCalledTimes(1)
    expect(applyState).toHaveBeenCalledWith(draft)
    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('invalid')
    expect(calls.setEditorMessage).toHaveBeenCalledWith(
      'Shared link could not be restored. Recovered your local draft.',
    )
    expect(calls.announceAssertive).toHaveBeenCalledWith(
      'Shared link could not be restored. Recovered your local draft.',
    )
    expect(calls.toastWarning).toHaveBeenCalledWith(
      'Shared link contained unknown furniture. Draft restored.',
    )
  })

  it('restores no-param non-empty draft and reports skipped outcome with polite info', () => {
    const draft = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const { calls, notifications } = createNotificationsSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'no-param' },
      catalog,
      validDraftState: draft,
      applyState,
      isFreshState: () => false,
      notifications,
    })

    expect(applyState).toHaveBeenCalledWith(draft)
    expect(calls.announcePolite).toHaveBeenCalledWith(
      'Restored your saved draft.',
    )
    expect(calls.toastSuccess).toHaveBeenCalledWith(
      'Restored your saved draft.',
    )
    expect(calls.setRestoreOutcome).toHaveBeenLastCalledWith('skipped')
  })

  it('keeps empty no-param draft restore silent except skipped outcome', () => {
    const emptyDraft = {
      items: [] as {
        id: string
        catalogId: string
        position: [number, number, number]
        rotationY: number
      }[],
      floorFinishId: 'floor-1',
      wallFinishId: 'wall-1',
    }
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const { calls, notifications } = createNotificationsSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'no-param' },
      catalog,
      validDraftState: emptyDraft,
      applyState,
      isFreshState: () => true,
      notifications,
    })

    expect(applyState).toHaveBeenCalledWith(emptyDraft)
    expect(calls.announcePolite).not.toHaveBeenCalled()
    expect(calls.toastSuccess).not.toHaveBeenCalled()
    expect(calls.announceAssertive).not.toHaveBeenCalled()
    expect(calls.setEditorMessage).not.toHaveBeenCalled()
    expect(calls.setRestoreOutcome).toHaveBeenLastCalledWith('skipped')
  })

  it('keeps invalid outcome when no-param draft restore throws', () => {
    const draft = createState('chair-1')
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn(() => {
      throw new Error('draft restore failed')
    })
    const { calls, notifications } = createNotificationsSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'no-param' },
      catalog,
      validDraftState: draft,
      applyState,
      isFreshState: () => false,
      notifications,
    })

    expect(calls.setRestoreOutcome).toHaveBeenCalledWith('invalid')
    expect(calls.setRestoreOutcome).not.toHaveBeenCalledWith('skipped')
    expect(calls.setEditorMessage).toHaveBeenCalledWith(
      'Draft failed to restore. Starting with an empty room.',
    )
    expect(calls.announceAssertive).toHaveBeenCalledWith(
      'Draft could not be restored. Starting with an empty room.',
    )
    expect(calls.toastError).toHaveBeenCalledWith(
      'Draft could not be restored.',
    )
  })

  it('keeps no-param draft restore silent when finishes match defaults even without furniture check', () => {
    const draft = {
      items: [
        {
          id: 'chair-instance-1',
          catalogId: 'chair-1',
          position: [0, 0, 0] as [number, number, number],
          rotationY: 0,
        },
      ],
      floorFinishId: 'wood-floor',
      wallFinishId: 'light-gray',
    }
    const catalog = [createCatalogEntry('chair-1')]
    const applyState = vi.fn()
    const { calls, notifications } = createNotificationsSpies()

    runStartupRestoreFlow({
      parseResult: { ok: false, reason: 'no-param' },
      catalog,
      validDraftState: draft,
      applyState,
      isFreshState: () => true,
      notifications,
    })

    expect(applyState).toHaveBeenCalledWith(draft)
    expect(calls.announcePolite).not.toHaveBeenCalled()
    expect(calls.toastSuccess).not.toHaveBeenCalled()
    expect(calls.setRestoreOutcome).toHaveBeenLastCalledWith('skipped')
  })
})
