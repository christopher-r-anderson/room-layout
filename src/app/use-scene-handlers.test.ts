// @vitest-environment jsdom
import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { runStartupRestoreFlow, useSceneHandlers } from './use-scene-handlers'
import type { FurnitureKind } from '@/scene/objects/furniture.types'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'

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
    })

    expect(mockCommands.addFurniture).toHaveBeenCalled()
    expect(mockSync.syncSceneReadModel).toHaveBeenCalled()
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
