import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  dialogActions,
  useIsBlockingOverlayOpen,
} from '@/core/stores/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import {
  sceneDocumentActions,
  useFloorFinishId,
  usePreviewedId,
  useSelectedFurniture,
  useWallFinishId,
} from '@/core/stores/scene-document-store'
import { feedbackActions } from '@/core/stores/feedback-store'
import {
  clearPreviewOnCanvasMiss,
  previewFromCanvasKeyboard,
  previewFromScene,
} from '@/core/operations/preview-actions'
import { usePreviewReconciler } from '@/core/operations/use-preview-reconciler'
import { getSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import { startSelectionEffectsReconciler } from '@/core/operations/selection-effects'
import {
  clearSelection,
  selectByCanvasPointer,
} from '@/core/operations/selection-actions'
import {
  moveSelection,
  rotateSelection,
} from '@/core/operations/movement-actions'
import { redo, undo } from '@/core/operations/history-actions'
import {
  openDeleteDialog,
  openDeleteDialogFromRoomView,
} from '@/features/selection/deletion-actions'
import { useShareController } from '@/app/controllers/use-share-controller'
import { useCanvasKeyboardController } from '@/app/controllers/use-canvas-keyboard-controller'
import { EditorRefsProvider } from '@/shared/providers/editor-refs-provider'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'
import { useCommandDispatchValue } from '@/core/commands/command-dispatch-context'
import type { EditorCommandApi } from '@/core/commands/editor-command'
import { useEditorInteractionsEnabled } from '@/core/stores/editor-lifecycle-store'
import { useEnvironmentConfig } from '@/core/stores/assets-store'
import { TooltipProvider } from '@/shared/ui/tooltip'
import { useStartupBootstrap } from '@/features/startup/use-startup-bootstrap'
import { EditorBody } from './chrome/editor-body'
import { EditorShell } from './chrome/editor-shell'
import { findFirstActionableInspectorControl } from './chrome/focusable-controls'
import {
  selectionFocusActions,
  useOutlinerFocusRequest,
} from '@/core/stores/selection-focus-store'
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

  useStartupBootstrap()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const environmentConfig = useEnvironmentConfig()

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
    editorInteractionsEnabled,
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

    selectionFocusActions.clearOutlinerFocusRequest()
  }, [isBlockingOverlayOpen, outlinerFocusRequest])

  const shareController = useShareController({
    activeFloorFinishId,
    activeWallFinishId,
  })
  const handleSetCameraPreset = useCallback(
    (preset: 'corner' | 'front' | 'side' | 'top') => {
      if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
        return
      }

      sceneCommands.setCameraPreset(preset)
    },
    [editorInteractionsEnabled],
  )
  const handleFocusSelected = useCallback(() => {
    if (!editorInteractionsEnabled || !sceneCommands.isSceneReady()) {
      return
    }

    sceneCommands.focusSelected()
  }, [editorInteractionsEnabled])
  const handleFloorLoadingChange = useCallback((loading: boolean) => {
    sceneDocumentActions.setFloorFinishLoading(loading)
  }, [])
  const handlers = {
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
    if (!editorInteractionsEnabled) {
      return
    }

    if (selectedFurniture === null) {
      requestOutlinerFocus()
      feedbackActions.announcePolite(
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
    editorInteractionsEnabled,
  ])

  const handleFocusRoomView = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    selectionFocusActions.requestRoomViewFocus()

    if (selectedFurniture !== null) {
      previewFromCanvasKeyboard(selectedFurniture.id)
    }
  }, [selectedFurniture, editorInteractionsEnabled])

  const handleFocusOutliner = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    requestOutlinerFocus()
  }, [requestOutlinerFocus, editorInteractionsEnabled])

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
        feedbackActions.clearStatusMessage()
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
              onClearSelection={clearSelection}
              editorOverlay={{
                topHeader: {
                  onShareSceneUrl: handlers.handleShareSceneUrl,
                },
              }}
            />
          </EditorShell>
        </CommandDispatchProvider>
      </EditorRefsProvider>
    </TooltipProvider>
  )
}

export default App
