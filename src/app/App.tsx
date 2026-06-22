import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  dialogActions,
  useIsBlockingOverlayOpen,
} from '@/editor-state/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import {
  sceneStateActions,
  useFloorFinishId,
  usePreviewedId,
  useSelectedFurniture,
  useWallFinishId,
} from '@/editor-state/scene-state-store'
import { announcementActions } from '@/editor-state/announcement-store'
import {
  clearPreviewOnCanvasMiss,
  previewFromCanvasKeyboard,
  previewFromScene,
} from '@/editor-state/preview-actions'
import { usePreviewReconciler } from '@/editor-state/use-preview-reconciler'
import { getSceneIsAtDefaults } from '@/editor-state/use-scene-is-at-defaults'
import { startSelectionEffectsReconciler } from '@/editor-state/selection-effects'
import {
  clearSelection,
  selectByCanvasPointer,
} from '@/editor-state/selection-actions'
import { moveSelection, rotateSelection } from '@/editor-state/movement-actions'
import { redo, undo } from '@/editor-state/history-actions'
import {
  openDeleteDialog,
  openDeleteDialogFromRoomView,
} from '@/features/selection/deletion-actions'
import { useAssetLifecycleController } from '@/app/controllers/use-asset-lifecycle-controller'
import { useShareController } from '@/app/controllers/use-share-controller'
import { useCanvasKeyboardController } from '@/app/controllers/use-canvas-keyboard-controller'
import { EditorRefsProvider } from '@/shared/providers/editor-refs-provider'
import { CommandDispatchProvider } from '@/editor-state/command-dispatch-provider'
import { useCommandDispatchValue } from '@/editor-state/command-dispatch-context'
import type { EditorCommandApi } from '@/editor-state/editor-command'
import {
  editorRuntimeActions,
  useAssetError,
  useEditorInteractionsEnabled,
  useStartupLoadingActive,
  useStartupOverlayActive,
  useStartupPhase,
} from '@/editor-state/editor-runtime-store'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { runStartupReset } from '@/features/startup/reset-startup-state'
import { useStartupState } from '@/features/startup/use-startup-state'
import { EditorBody } from './chrome/editor-body'
import { EditorShell } from './chrome/editor-shell'
import { findFirstActionableInspectorControl } from './chrome/focusable-controls'
import {
  resetSelectionMetaStore,
  selectionMetaActions,
  useOutlinerFocusRequest,
} from '@/editor-state/selection-meta-store'
import { useRequestOutlinerFocus } from '@/app/controllers/use-request-outliner-focus'
import { perfCounters } from '@/shared/debug/perf-counters'
import { useDraftPersistence } from '@/features/url-scene/use-draft-persistence'
import { sceneCommands } from '@/scene/scene-commands'
import { useActiveFinishIds } from '@/app/controllers/_shared/use-active-finish-ids'
import { useTestStateBridge } from './testing/use-test-state-bridge'
import {
  buildDialogRuntimeContext,
  bootstrapDialogRegistry,
} from './dialogs/bootstrap-dialog-registry'

function App() {
  if (import.meta.env.DEV) {
    perfCounters.incrAppRender()
  }
  const roomViewRef = useRef<HTMLElement | null>(null)
  const selectedItemControlsRef = useRef<HTMLDivElement | null>(null)
  const dockedInspectorRef = useRef<HTMLDivElement | null>(null)
  const selectedFurniture = useSelectedFurniture()
  const floorFinishId = useFloorFinishId()
  const wallFinishId = useWallFinishId()
  const [testOverlaysHidden, setTestOverlaysHidden] = useState(false)
  const outlinerFocusRequest = useOutlinerFocusRequest()
  const requestOutlinerFocus = useRequestOutlinerFocus()
  const isE2ELowRenderQuality =
    import.meta.env.DEV && import.meta.env.VITE_E2E_RENDER_QUALITY === 'low'
  const canvasShadowMode = isE2ELowRenderQuality ? false : 'percentage'

  const resetOverlayShellState = useCallback(() => {
    sceneStateActions.resetSceneState()
    resetSelectionMetaStore()
  }, [])

  const {
    catalog,
    collections,
    environmentConfig: startupEnvironmentConfig,
    cacheInvalidationKey,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
  } = useStartupState()
  const assetError = useAssetError()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const startupLoadingActive = useStartupLoadingActive()
  const startupOverlayActive = useStartupOverlayActive()
  const startupPhase = useStartupPhase()

  const resetEditorShellState = useCallback(() => {
    runStartupReset({ resetOverlayState: resetOverlayShellState })
  }, [resetOverlayShellState])

  const startup = useMemo(
    () => ({
      assetError,
      assetErrorKind: assetError?.kind ?? null,
      assetsReady: startupPhase === 'ready',
      catalog,
      collections,
      environmentConfig: startupEnvironmentConfig,
      editorInteractionsEnabled,
      cacheInvalidationKey,
      startupLoadingActive,
      startupOverlayActive,
      handleAssetError,
      handleAssetsReady,
      retryAssetLoading,
      resetEditorShellState,
    }),
    [
      assetError,
      startupPhase,
      catalog,
      collections,
      startupEnvironmentConfig,
      editorInteractionsEnabled,
      cacheInvalidationKey,
      startupLoadingActive,
      startupOverlayActive,
      handleAssetError,
      handleAssetsReady,
      retryAssetLoading,
      resetEditorShellState,
    ],
  )

  const environmentConfig = startup.environmentConfig

  const {
    activeFloorFinishId,
    activeWallFinishId,
    selectedFloorOption,
    selectedWallOption,
  } = useActiveFinishIds({
    environmentConfig,
    floorFinishId,
    wallFinishId,
  })

  useDraftPersistence({
    environmentConfig,
  })

  const dialogRuntimeContext = useMemo(
    () =>
      buildDialogRuntimeContext({
        canStartOver: () => !getSceneIsAtDefaults(),
      }),
    [],
  )
  useEffect(() => {
    bootstrapDialogRegistry(dialogRuntimeContext)
  }, [dialogRuntimeContext])

  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()

  useEffect(() => startSelectionEffectsReconciler(), [])
  const wasBlockingOverlayOpenRef = useRef(isBlockingOverlayOpen)

  usePreviewReconciler()
  const previewedId = usePreviewedId({
    isBlockingOverlayOpen,
    editorInteractionsEnabled: startup.editorInteractionsEnabled,
  })

  useEffect(() => {
    const wasBlockingOverlayOpen = wasBlockingOverlayOpenRef.current
    wasBlockingOverlayOpenRef.current = isBlockingOverlayOpen

    if (
      !isBlockingOverlayOpen ||
      wasBlockingOverlayOpen ||
      outlinerFocusRequest === null
    ) {
      return
    }

    selectionMetaActions.clearOutlinerFocusRequest()
  }, [isBlockingOverlayOpen, outlinerFocusRequest])

  const assetLifecycleController = useAssetLifecycleController({
    closeActiveDialog: dialogActions.closeActiveDialog,
    startup: {
      catalog: startup.catalog,
      defaultFloorFinishId: environmentConfig?.defaultFloorFinishId ?? '',
      defaultWallFinishId: environmentConfig?.defaultWallFinishId ?? '',
      floorFinishIds:
        environmentConfig?.floorFinishes.map((option) => option.id) ?? [],
      wallFinishIds:
        environmentConfig?.wallFinishes.map((option) => option.id) ?? [],
      handleAssetError: startup.handleAssetError,
      handleAssetsReady: startup.handleAssetsReady,
      retryAssetLoading: startup.retryAssetLoading,
      resetEditorShellState: startup.resetEditorShellState,
    },
  })
  const shareController = useShareController({
    activeFloorFinishId,
    activeWallFinishId,
  })
  const handleSetCameraPreset = useCallback(
    (preset: 'corner' | 'front' | 'side' | 'top') => {
      if (!startup.editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
        return
      }

      sceneCommands.setCameraPreset(preset)
    },
    [startup.editorInteractionsEnabled],
  )
  const handleFocusSelected = useCallback(() => {
    if (!startup.editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
      return
    }

    sceneCommands.focusSelected()
  }, [startup.editorInteractionsEnabled])
  const handleFloorLoadingChange = useCallback((loading: boolean) => {
    editorRuntimeActions.setFloorFinishLoading(loading)
  }, [])
  const handlers = {
    ...assetLifecycleController,
    ...shareController,
    handleSetCameraPreset,
    handleFocusSelected,
  }

  const editorRefs = useMemo(
    () => ({ roomViewRef, selectedItemControlsRef, dockedInspectorRef }),
    [],
  )

  const { previewedIdRef, handleCanvasBrowse, handleCanvasSelectPreviewed } =
    useCanvasKeyboardController({
      previewedId,
    })

  const handleFocusInspector = useCallback(() => {
    if (!startup.editorInteractionsEnabled) {
      return
    }

    if (selectedFurniture === null) {
      requestOutlinerFocus()
      announcementActions.announcePolite(
        'No item selected. Focus moved to Furniture in room.',
      )
      return
    }

    const firstFocusableControl = findFirstActionableInspectorControl(
      dockedInspectorRef.current,
    )

    firstFocusableControl?.focus()
  }, [
    dockedInspectorRef,
    requestOutlinerFocus,
    selectedFurniture,
    startup.editorInteractionsEnabled,
  ])

  const handleFocusRoomView = useCallback(() => {
    if (!startup.editorInteractionsEnabled) {
      return
    }

    selectionMetaActions.requestRoomViewFocus()

    if (selectedFurniture !== null) {
      previewFromCanvasKeyboard(selectedFurniture.id)
    }
  }, [selectedFurniture, startup.editorInteractionsEnabled])

  const handleFocusOutliner = useCallback(() => {
    if (!startup.editorInteractionsEnabled) {
      return
    }

    requestOutlinerFocus()
  }, [requestOutlinerFocus, startup.editorInteractionsEnabled])

  useTestStateBridge({
    activeFloorFinishId,
    activeWallFinishId,
    previewedIdRef,
    setTestOverlaysHidden,
  })

  const commandApi: EditorCommandApi = {
    focusInspector: handleFocusInspector,
    focusRoomView: handleFocusRoomView,
    focusOutliner: handleFocusOutliner,
    undo,
    redo,
    startOverIntent: () => {
      const opened = dialogActions.openDialog(DIALOG_IDS.startOver)
      if (opened) {
        sceneStateActions.clearEditorMessage()
      }
    },
    openDeleteDialog: (returnFocusTo) => {
      if (returnFocusTo === 'room-view') {
        openDeleteDialogFromRoomView()
      } else {
        openDeleteDialog()
      }
    },
    focusSelected: handlers.handleFocusSelected,
    moveSelection: (delta) => {
      moveSelection(delta, { source: 'keyboard' })
    },
    clearSelection: () => {
      clearSelection()
      clearPreviewOnCanvasMiss()
    },
    rotate: rotateSelection,
    setCameraPreset: handlers.handleSetCameraPreset,
    canvasBrowse: handleCanvasBrowse,
    canvasSelectPreviewed: handleCanvasSelectPreviewed,
    share: () => {
      void handlers.handleShareSceneUrl()
    },
  }

  const dispatchCommand = useCommandDispatchValue(commandApi)

  return (
    <TooltipProvider>
      <EditorRefsProvider value={editorRefs}>
        <CommandDispatchProvider value={dispatchCommand}>
          <EditorShell>
            <EditorBody
              catalog={startup.catalog}
              collections={startup.collections}
              cacheInvalidationKey={startup.cacheInvalidationKey}
              testOverlaysHidden={testOverlaysHidden}
              canvasShadowMode={canvasShadowMode}
              isE2ELowRenderQuality={isE2ELowRenderQuality}
              previewedId={previewedId}
              selectedFloorOption={selectedFloorOption}
              selectedWallOption={selectedWallOption}
              clearPreviewOnCanvasMiss={clearPreviewOnCanvasMiss}
              onScenePreviewChange={previewFromScene}
              onFloorLoadingChange={handleFloorLoadingChange}
              onCanvasPointerSelection={selectByCanvasPointer}
              onSceneAssetsReady={handlers.handleSceneAssetsReady}
              onSceneAssetError={handlers.handleSceneAssetError}
              onClearSelection={clearSelection}
              editorOverlay={{
                topHeader: {
                  onShareSceneUrl: handlers.handleShareSceneUrl,
                },
                onRetryAssetLoading: handlers.handleRetryAssetLoading,
              }}
            />
          </EditorShell>
        </CommandDispatchProvider>
      </EditorRefsProvider>
    </TooltipProvider>
  )
}

export default App
