import { Canvas } from '@react-three/fiber'
import { Scene } from './scene/scene'
import {
  Component,
  Suspense,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
} from 'react'
import type {
  MoveSelectionResult,
  MoveSource,
  SceneRef,
} from './scene/scene.types'
import { EditorOverlay } from './app/editor-overlay'
import { runEditorShellReset } from './app/editor-shell-reset'
import {
  runStartupAssetErrorTransition,
  runStartupRetryTransition,
} from './app/startup-transition-sequencing'
import { useEditorDialogState } from './app/use-editor-dialog-state'
import { useEditorKeyboardShortcuts } from './app/use-editor-keyboard-shortcuts'
import { useEditorOverlayState } from './app/use-editor-overlay-state'
import { useEditorOverlayProps } from './app/use-editor-overlay-props'
import { useEditorSceneCommands } from './app/use-editor-scene-commands'
import { useEditorAnnouncements } from './app/use-editor-announcements'
import { useSceneReadModelSync } from './app/use-scene-read-model-sync'
import { useSceneStartupState } from './app/use-scene-startup-state'
import { ScreenReaderAnnouncer } from './app/components/scene/screen-reader-announcer'
import { TooltipProvider } from './components/ui/tooltip'

interface BrowserSceneState {
  assetsReady: boolean
  assetError: boolean
  selectedId: string | null
  selectedName: string | null
  itemCount: number
  items: {
    id: string
    catalogId: string
    name: string
    position: [number, number, number]
    rotationY: number
    pointerTarget: {
      x: number
      y: number
    } | null
  }[]
}

declare global {
  interface Window {
    __ROOM_LAYOUT_TEST__?: {
      getState: () => BrowserSceneState
    }
  }
}

const ROTATION_STEP_RADIANS = Math.PI / 12

function formatCoordinate(value: number) {
  return `${value.toFixed(1)} meters`
}

function formatMoveBlockedMessage(
  reason: Exclude<MoveSelectionResult, { ok: true }>['reason'],
) {
  switch (reason) {
    case 'blocked-bounds':
      return 'Movement blocked by room bounds.'
    case 'blocked-collision':
      return 'Movement blocked by another furniture item.'
    case 'dragging':
      return 'Finish dragging before using movement controls.'
    case 'no-selection':
      return 'Select a furniture item first.'
    case 'no-op':
      return ''
  }
}

class SceneAssetErrorBoundary extends Component<
  {
    children: ReactNode
    onError: (error: Error) => void
  },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}

function App() {
  const sceneRef = useRef<SceneRef | null>(null)
  const {
    assetError,
    assetErrorRef,
    assetsReadyRef,
    editorInteractionsEnabled,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    sceneVersion,
    startupLoadingActive,
    startupOverlayActive,
  } = useSceneStartupState()
  const editorOverlayState = useEditorOverlayState()
  const {
    catalogIdToAdd,
    clearEditorMessage,
    editorMessage,
    handleHistoryChange,
    handleSceneReadModelChange,
    historyAvailability,
    resetOverlayState,
    sceneReadModel,
    selectedFurniture,
    setCatalogIdToAdd,
    setEditorMessage,
  } = editorOverlayState
  const {
    addFurniture,
    clearSelection,
    confirmDeleteSelection,
    moveSelection,
    redo,
    rotateSelection,
    undo,
  } = useEditorSceneCommands({
    catalogIdToAdd,
    clearEditorMessage,
    editorInteractionsEnabled,
    rotationStepRadians: ROTATION_STEP_RADIANS,
    sceneRef,
    setEditorMessage,
  })
  const dialogState = useEditorDialogState({
    editorInteractionsEnabled,
    startupOverlayActive,
    selectedFurniture,
  })
  const {
    closeAllDialogs,
    closeDialog,
    isCatalogDrawerOpen,
    isDeleteDialogOpen,
    isInfoDialogOpen,
    isModalOpen,
    openDelete,
    pendingDeleteFurniture,
    setCatalogOpen,
    setInfoOpen,
  } = dialogState
  const {
    politeAnnouncement,
    assertiveAnnouncement,
    announcePolite,
    announceAssertive,
    clearAssertiveAnnouncement,
    queueMovementAnnouncement,
    clearQueuedMovementAnnouncement,
  } = useEditorAnnouncements()
  const {
    syncSceneReadModel,
    outlinerFocusRequest,
    handleOutlinerFocusHandled,
    requestOutlinerFocusByIndex,
  } = useSceneReadModelSync({
    sceneRef,
    isModalOpen,
    handleSceneReadModelChange,
    announcePolite,
  })

  const resetEditorShellState = useCallback(() => {
    runEditorShellReset({
      resetOverlayState,
      sceneRef,
    })
  }, [resetOverlayState])

  const handleCatalogDrawerOpenChange = useCallback(
    (open: boolean) => {
      const changed = setCatalogOpen(open)

      if (open && changed) {
        clearEditorMessage()
      }
    },
    [clearEditorMessage, setCatalogOpen],
  )

  const handleOpenDeleteDialog = useCallback(() => {
    const opened = openDelete()

    if (opened) {
      clearEditorMessage()
    }
  }, [clearEditorMessage, openDelete])

  const handleAddFurniture = useCallback(() => {
    const added = addFurniture()
    const nextReadModel = syncSceneReadModel({
      announceSelectionChange: false,
      requestOutlinerFocus: false,
    })

    if (added) {
      const addedItem = nextReadModel?.items.find(
        (item) => item.id === nextReadModel.selectedId,
      )

      if (addedItem) {
        announcePolite(`${addedItem.name} added to room.`)
      }
    }

    return added
  }, [addFurniture, announcePolite, syncSceneReadModel])

  const handleSelectById = useCallback(
    (id: string | null) => {
      const result = sceneRef.current?.selectById(id) ?? {
        ok: false as const,
        status: 'not-found' as const,
      }
      syncSceneReadModel({
        requestOutlinerFocus: false,
      })

      return result
    },
    [syncSceneReadModel],
  )

  const handleMoveSelection = useCallback(
    (delta: { x: number; z: number }, options?: { source?: MoveSource }) => {
      const result = moveSelection(delta, options)

      if (result.ok) {
        const nextReadModel = syncSceneReadModel()
        const movedItem = nextReadModel?.items.find(
          (item) => item.id === nextReadModel.selectedId,
        )

        if (movedItem) {
          queueMovementAnnouncement(
            `${movedItem.name} moved to X ${formatCoordinate(movedItem.position[0])} and Z ${formatCoordinate(movedItem.position[2])}.`,
          )
        }

        return result
      }

      const blockedMessage = formatMoveBlockedMessage(result.reason)

      if (blockedMessage) {
        queueMovementAnnouncement(blockedMessage)
      }

      return result
    },
    [moveSelection, queueMovementAnnouncement, syncSceneReadModel],
  )

  const handleClearSelection = useCallback(() => {
    clearSelection()
    syncSceneReadModel({
      requestOutlinerFocus: false,
    })
  }, [clearSelection, syncSceneReadModel])

  const handleConfirmDeleteSelection = useCallback(() => {
    const deletedIndex = pendingDeleteFurniture
      ? sceneReadModel.items.findIndex(
          (item) => item.id === pendingDeleteFurniture.id,
        )
      : -1
    const deletedName = pendingDeleteFurniture?.name ?? null

    closeDialog()

    const deleted = confirmDeleteSelection()
    const nextReadModel = syncSceneReadModel()

    if (deleted) {
      requestOutlinerFocusByIndex(deletedIndex >= 0 ? deletedIndex : 0)

      if (deletedName) {
        announcePolite(`${deletedName} removed from room.`)
      }
    }

    return nextReadModel
  }, [
    announcePolite,
    closeDialog,
    confirmDeleteSelection,
    pendingDeleteFurniture,
    requestOutlinerFocusByIndex,
    sceneReadModel.items,
    syncSceneReadModel,
  ])

  const handleRotateSelection = useCallback(
    (direction: -1 | 1) => {
      const rotatingName = selectedFurniture?.name ?? null

      rotateSelection(direction)
      syncSceneReadModel()

      if (rotatingName) {
        announcePolite(`${rotatingName} rotated.`)
      }
    },
    [
      announcePolite,
      rotateSelection,
      selectedFurniture?.name,
      syncSceneReadModel,
    ],
  )

  const handleUndo = useCallback(() => {
    undo()
    syncSceneReadModel()
    announcePolite('Undo complete.')
  }, [announcePolite, syncSceneReadModel, undo])

  const handleRedo = useCallback(() => {
    redo()
    syncSceneReadModel()
    announcePolite('Redo complete.')
  }, [announcePolite, redo, syncSceneReadModel])

  const handleSceneSelectionChange = useCallback(() => {
    syncSceneReadModel({
      requestOutlinerFocus: false,
    })
  }, [syncSceneReadModel])

  const handleSceneHistoryChange = useCallback(
    (availability: Parameters<typeof handleHistoryChange>[0]) => {
      handleHistoryChange(availability)
      syncSceneReadModel()
    },
    [handleHistoryChange, syncSceneReadModel],
  )

  const handleSceneAssetError = useCallback(
    (error: Error) => {
      runStartupAssetErrorTransition(error, {
        closeAllDialogs,
        recordAssetError: handleAssetError,
        resetEditorShellState,
      })
      announceAssertive('Unable to load room editor assets. Retry available.')
    },
    [
      announceAssertive,
      closeAllDialogs,
      handleAssetError,
      resetEditorShellState,
    ],
  )

  const handleSceneAssetsReady = useCallback(() => {
    handleAssetsReady()
    syncSceneReadModel()
  }, [handleAssetsReady, syncSceneReadModel])

  const handleRetryAssetLoading = useCallback(() => {
    runStartupRetryTransition({
      closeAllDialogs,
      resetEditorShellState,
      retryAssetLoading,
    })
    clearAssertiveAnnouncement()
  }, [
    clearAssertiveAnnouncement,
    closeAllDialogs,
    resetEditorShellState,
    retryAssetLoading,
  ])

  useEffect(() => {
    return () => {
      clearQueuedMovementAnnouncement()
    }
  }, [clearQueuedMovementAnnouncement])
  const {
    startupProps,
    historyProps,
    sceneProps,
    selectionProps,
    catalogProps,
    dialogsProps,
  } = useEditorOverlayProps({
    assetError: Boolean(assetError),
    startupLoadingActive,
    startupOverlayActive,
    onRetryAssetLoading: handleRetryAssetLoading,
    historyAvailability,
    onUndo: handleUndo,
    onRedo: handleRedo,
    focusRequest: outlinerFocusRequest,
    onFocusHandled: handleOutlinerFocusHandled,
    onSelectById: handleSelectById,
    readModel: sceneReadModel,
    sceneInteractionsDisabled: !editorInteractionsEnabled || isModalOpen,
    selectedFurniture,
    onMoveSelection: handleMoveSelection,
    onOpenDeleteDialog: handleOpenDeleteDialog,
    onRotateSelection: handleRotateSelection,
    catalogIdToAdd,
    isCatalogDrawerOpen,
    onAddFurniture: handleAddFurniture,
    onCatalogIdToAddChange: setCatalogIdToAdd,
    onCatalogDrawerOpenChange: handleCatalogDrawerOpenChange,
    isDeleteDialogOpen,
    pendingDeleteFurniture,
    onCloseDeleteDialog: closeDialog,
    onConfirmDeleteSelection: handleConfirmDeleteSelection,
    isInfoDialogOpen,
    onInfoDialogOpenChange: setInfoOpen,
  })

  useEffect(() => {
    if (!import.meta.env.DEV) {
      return
    }

    window.__ROOM_LAYOUT_TEST__ = {
      getState: () => {
        const sceneState = sceneRef.current?.getSnapshot()

        return {
          assetsReady: assetsReadyRef.current,
          assetError: assetErrorRef.current !== null,
          selectedId: sceneState?.selectedId ?? null,
          selectedName: sceneState?.selectedName ?? null,
          itemCount: sceneState?.itemCount ?? 0,
          items: sceneState?.items ?? [],
        }
      },
    }

    return () => {
      delete window.__ROOM_LAYOUT_TEST__
    }
  }, [assetErrorRef, assetsReadyRef])

  useEditorKeyboardShortcuts({
    enabled: editorInteractionsEnabled,
    canUndo: historyAvailability.canUndo,
    canRedo: historyAvailability.canRedo,
    hasSelection: selectedFurniture !== null,
    isModalOpen,
    onUndo: handleUndo,
    onRedo: handleRedo,
    onOpenDeleteDialog: handleOpenDeleteDialog,
    onMoveSelection: (delta) => {
      handleMoveSelection(delta, { source: 'keyboard' })
    },
    onClearSelection: handleClearSelection,
    onRotate: handleRotateSelection,
  })

  return (
    <TooltipProvider>
      <main className="relative size-full" aria-busy={startupLoadingActive}>
        <p id="scene-instructions" className="sr-only">
          Interactive 3D room editor. Use the furniture list to select items and
          the selected item panel to move, rotate, or delete them without
          dragging.
        </p>
        <section
          aria-describedby="scene-instructions"
          aria-label="Interactive 3D room editor"
          className="absolute inset-0 z-0"
        >
          <Canvas
            className="absolute inset-0 z-0"
            camera={{
              position: [3, 2.5, 3],
              fov: 50,
            }}
            onPointerMissed={() => {
              if (!editorInteractionsEnabled) {
                return
              }

              handleClearSelection()
            }}
            shadows
          >
            <color attach="background" args={['#f0f0f0']} />
            <SceneAssetErrorBoundary
              key={sceneVersion}
              onError={handleSceneAssetError}
            >
              <Suspense fallback={null}>
                <Scene
                  ref={sceneRef}
                  onSelectionChange={handleSceneSelectionChange}
                  onHistoryChange={handleSceneHistoryChange}
                  onAssetsReady={handleSceneAssetsReady}
                />
              </Suspense>
            </SceneAssetErrorBoundary>
          </Canvas>
        </section>

        <EditorOverlay
          editorInteractionsEnabled={editorInteractionsEnabled}
          statusMessage={editorMessage}
          startup={startupProps}
          history={historyProps}
          scene={sceneProps}
          selection={selectionProps}
          catalog={catalogProps}
          dialogs={dialogsProps}
        />
        <ScreenReaderAnnouncer
          politeMessage={politeAnnouncement}
          assertiveMessage={assertiveAnnouncement}
        />
      </main>
    </TooltipProvider>
  )
}

export default App
