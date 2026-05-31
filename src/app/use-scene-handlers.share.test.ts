// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { useSceneHandlers } from './use-scene-handlers'

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
    openStartOver: vi.fn(),
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

describe('useSceneHandlers', () => {
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
})
