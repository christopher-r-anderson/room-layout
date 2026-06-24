import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useIsBlockingOverlayOpen } from '@/core/stores/dialog-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { previewFromScene } from '@/core/operations/preview-actions'
import { usePreviewReconciler } from '@/core/operations/use-preview-reconciler'
import { getSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import { startSelectionEffectsReconciler } from '@/core/operations/selection-effects'
import {
  clearCanvasSelection,
  selectByCanvasPointer,
} from '@/core/operations/selection-actions'
import { useEnvironmentConfig } from '@/core/stores/assets-store'
import { useStartupBootstrap } from '@/features/startup/use-startup-bootstrap'
import { EditorBody } from './chrome/editor-body'
import { EditorProviders } from './chrome/providers/editor-providers'
import {
  selectionFocusActions,
  useOutlinerFocusRequest,
} from '@/core/stores/selection-focus-store'
import { perfCounters } from '@/shared/debug/perf-counters'
import { IS_E2E_BUILD } from '@/shared/env/e2e'
import { useDraftPersistence } from '@/features/url-scene/use-draft-persistence'
import { useActiveFinishIds } from '@/core/operations/active-finish-ids'
import { useTestStateBridge } from './testing/use-test-state-bridge'
import {
  buildDialogRuntimeContext,
  bootstrapDialogRegistry,
} from './dialogs/bootstrap-dialog-registry'

function App() {
  if (import.meta.env.DEV || IS_E2E_BUILD) {
    perfCounters.incrAppRender()
  }
  const [testOverlaysHidden, setTestOverlaysHidden] = useState(false)
  const outlinerFocusRequest = useOutlinerFocusRequest()
  const isE2ELowRenderQuality =
    import.meta.env.VITE_E2E_RENDER_QUALITY === 'low'
  const canvasShadowMode = isE2ELowRenderQuality ? false : 'percentage'

  useStartupBootstrap()
  const environmentConfig = useEnvironmentConfig()

  const {
    activeFloorFinishId,
    activeWallFinishId,
    selectedFloorOption,
    selectedWallOption,
  } = useActiveFinishIds()

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

  const handleFloorLoadingChange = useCallback((loading: boolean) => {
    sceneDocumentActions.setFloorFinishLoading(loading)
  }, [])

  useTestStateBridge({
    activeFloorFinishId,
    activeWallFinishId,
    setTestOverlaysHidden,
  })

  return (
    <EditorProviders>
      <EditorBody
        testOverlaysHidden={testOverlaysHidden}
        canvasShadowMode={canvasShadowMode}
        isE2ELowRenderQuality={isE2ELowRenderQuality}
        selectedFloorOption={selectedFloorOption}
        selectedWallOption={selectedWallOption}
        onScenePreviewChange={previewFromScene}
        onFloorLoadingChange={handleFloorLoadingChange}
        onCanvasPointerSelection={selectByCanvasPointer}
        onClearCanvasSelection={clearCanvasSelection}
      />
    </EditorProviders>
  )
}

export default App
