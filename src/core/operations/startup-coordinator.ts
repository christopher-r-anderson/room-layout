import { msg } from '@lingui/core/macro'
import { createDefaultSceneState } from '@/domain/scene-defaults'
import { isSceneStateAtDefaults } from '@/domain/scene-model'
import { i18n } from '@/shared/i18n/i18n'
import { clearSceneServices } from '@/core/scene-services'
import { resetCollectionPipeline } from './collection-loader'
import { resetPreviewState } from './preview-actions'
import { restoreInitialLayout } from './history-mutations'
import { feedbackActions } from '@/core/stores/feedback-store'
import { feedback } from '@/core/feedback/feedback'
import { dialogActions } from '@/core/stores/dialog-store'
import {
  editorLifecycleActions,
  useEditorLifecycleStore,
  type StartupErrorKind,
} from '@/core/stores/editor-lifecycle-store'
import { useAssetsStore } from '@/core/stores/assets-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { resetSceneSessionStore } from '@/core/stores/scene-session-store'
import { resetSelectionStore } from '@/core/stores/selection-store'
import { resetToolbarGeometryStore } from '@/core/stores/toolbar-geometry-store'
import { resetToolbarInteractionStore } from '@/core/stores/toolbar-interaction-store'
import { loadSceneDraft, saveSceneDraft } from '@/core/persistence/scene-draft'
import {
  parseSceneUrl,
  removeSceneParamFromUrl,
} from '@/core/persistence/scene-url'
import { runStartupBootstrap } from './startup-bootstrap'
import { runStartupRestoreFlow, validateDraftState } from './restore-flow'
import type { RestorableState } from './restore-flow.types'

// Resets the editor surface back to a clean slate. Used by the asset-error and
// retry transitions so a failed or restarted load never leaves stale scene or
// selection state behind.
function resetStartupShell() {
  sceneDocumentActions.reset()
  resetSceneSessionStore()
  // The session reset clears the raw preview pointer; this clears the preview
  // module scratch (hysteresis timer, active source) alongside it.
  resetPreviewState()
  resetSelectionStore()
  resetToolbarGeometryStore()
  resetToolbarInteractionStore()
  clearSceneServices()
}

function resolveFinishContext() {
  const { catalog, environmentConfig } = useAssetsStore.getState()

  return {
    catalog,
    defaultFloorFinishId: environmentConfig?.defaultFloorFinishId ?? '',
    defaultWallFinishId: environmentConfig?.defaultWallFinishId ?? '',
    defaultLightingMoodId: environmentConfig?.defaultLightingMoodId ?? '',
    floorFinishIds:
      environmentConfig?.floorFinishes.map((option) => option.id) ?? [],
    wallFinishIds:
      environmentConfig?.wallFinishes.map((option) => option.id) ?? [],
    lightingMoodIds:
      environmentConfig?.lightingMoods.map((option) => option.id) ?? [],
  }
}

function runRestoreOnce() {
  const finish = resolveFinishContext()
  const {
    catalog,
    defaultFloorFinishId,
    defaultWallFinishId,
    defaultLightingMoodId,
  } = finish

  const draftState = loadSceneDraft()
  const parseResult = parseSceneUrl(window.location.href)
  const shouldCleanupSceneParam = parseResult.ok
    ? true
    : parseResult.reason !== 'no-param'

  if (shouldCleanupSceneParam) {
    try {
      window.history.replaceState(
        window.history.state,
        '',
        removeSceneParamFromUrl(window.location.href),
      )
    } catch {
      // Ignore malformed URL/state failures and continue the restore flow.
    }
  }

  const applyFinishIds = (
    floorFinishId: string | undefined,
    wallFinishId: string | undefined,
    lightingMoodId: string | undefined,
  ) => {
    if (floorFinishId && finish.floorFinishIds.includes(floorFinishId)) {
      sceneDocumentActions.setFloorFinishId(floorFinishId)
    }

    if (wallFinishId && finish.wallFinishIds.includes(wallFinishId)) {
      sceneDocumentActions.setWallFinishId(wallFinishId)
    }

    if (lightingMoodId && finish.lightingMoodIds.includes(lightingMoodId)) {
      sceneDocumentActions.setLightingMoodId(lightingMoodId)
    }
  }

  const normalizeRestoredState = (state: RestorableState) => {
    const normalizedFloorFinishId = finish.floorFinishIds.includes(
      state.floorFinishId ?? '',
    )
      ? state.floorFinishId
      : defaultFloorFinishId
    const normalizedWallFinishId = finish.wallFinishIds.includes(
      state.wallFinishId ?? '',
    )
      ? state.wallFinishId
      : defaultWallFinishId
    const normalizedLightingMoodId = finish.lightingMoodIds.includes(
      state.lightingMoodId ?? '',
    )
      ? state.lightingMoodId
      : defaultLightingMoodId

    return {
      ...state,
      floorFinishId: normalizedFloorFinishId,
      wallFinishId: normalizedWallFinishId,
      lightingMoodId: normalizedLightingMoodId,
    }
  }

  const applyRestoredState = (state: RestorableState) => {
    const normalizedState = normalizeRestoredState(state)

    restoreInitialLayout(normalizedState.items)
    applyFinishIds(
      normalizedState.floorFinishId,
      normalizedState.wallFinishId,
      normalizedState.lightingMoodId,
    )
    saveSceneDraft(normalizedState.items, {
      floorFinishId: normalizedState.floorFinishId,
      wallFinishId: normalizedState.wallFinishId,
      lightingMoodId: normalizedState.lightingMoodId,
    })
  }

  const validDraftState = validateDraftState(draftState, catalog)

  const defaultSceneState = createDefaultSceneState({
    defaultFloorFinishId,
    defaultWallFinishId,
    defaultLightingMoodId,
  })

  runStartupRestoreFlow({
    parseResult,
    catalog,
    validDraftState,
    applyState: applyRestoredState,
    isFreshState: (state) => {
      const normalizedState = normalizeRestoredState(state)

      return isSceneStateAtDefaults(
        {
          items: normalizedState.items,
          floorFinishId: normalizedState.floorFinishId,
          wallFinishId: normalizedState.wallFinishId,
          lightingMoodId: normalizedState.lightingMoodId,
        },
        defaultSceneState,
      )
    },
    notifications: {
      announcePolite: feedbackActions.announcePolite,
      announceAssertive: feedbackActions.announceAssertive,
      setStatusMessage: feedbackActions.setStatusMessage,
      setRestoreOutcome: editorLifecycleActions.recordRestoreOutcome,
      toastSuccess: (message) => {
        feedback.actionSuccess({ title: message })
      },
      toastWarning: (message) => {
        feedback.actionWarning({ title: message })
      },
      toastError: (message) => {
        feedback.actionError({ title: message })
      },
    },
  })
}

// Assets are ready. Runs the restore flow (shared link -> draft -> defaults)
// once per startup cycle, guarded by the attempt count so a Scene remount does
// not re-run it. A retry resets the count (requestRetry): the error path wiped
// the document, so the fresh cycle must restore the draft again.
export function completeAssetLoad() {
  if (useEditorLifecycleStore.getState().restoreAttemptCount === 0) {
    editorLifecycleActions.incrementRestoreAttempt()
    runRestoreOnce()
  }

  editorLifecycleActions.markAssetsReady()
}

function reportStartupError(kind: StartupErrorKind, error: Error) {
  editorLifecycleActions.setAssetError({
    kind,
    message: error.message,
  })
  dialogActions.closeActiveDialog()
  resetStartupShell()
  const assetError = i18n._(
    msg`Unable to load room editor assets. Retry available.`,
  )
  feedback.actionError({ title: assetError })
  feedbackActions.announceAssertive(assetError)
}

// A furniture/scene asset failed while loading or rendering.
export function notifyAssetError(error: Error) {
  reportStartupError('asset-load', error)
}

// One of the app's own lazy chunks (engine, chrome) failed to fetch. Kept as a
// distinct kind because its recovery differs: the retry reloads the page (see
// startup-chunk-retry) rather than re-requesting assets in place.
export function notifyChunkLoadError(error: Error) {
  reportStartupError('app-chunk', error)
}

// Retry startup: drop the buffered asset bytes so it re-downloads, start a
// fresh cycle (which remounts the Scene), and re-run the bootstrap fetch.
export function requestAssetRetry() {
  dialogActions.closeActiveDialog()
  resetStartupShell()
  // Only reset the collection pipeline on an explicit retry (which remounts the
  // loader via the cycle), not on the error path: a gated failure's `failed`
  // mark must survive so the loader does not immediately re-attempt and loop.
  resetCollectionPipeline()

  editorLifecycleActions.requestRetry()
  feedbackActions.clearAssertiveAnnouncement()
  runStartupBootstrap()
}
