import { clearSceneServices } from '@/core/scene-services'
import { resetCollectionPipeline } from './collection-loader'
import { resetPreviewState } from './preview-actions'
import { feedback } from '@/core/stores/feedback-store'
import { dialogActions } from '@/core/stores/dialog-store'
import {
  editorLifecycleActions,
  useEditorLifecycleStore,
  type StartupErrorKind,
} from '@/core/stores/editor-lifecycle-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { resetSceneSessionStore } from '@/core/stores/scene-session-store'
import { resetSelectionStore } from '@/core/stores/selection-store'
import { resetFocusStore } from '@/core/stores/focus-store'
import { resetToolbarGeometryStore } from '@/core/stores/toolbar-geometry-store'
import { resetToolbarInteractionStore } from '@/core/stores/toolbar-interaction-store'
import { loadSceneDraft } from '@/core/persistence/scene-draft'
import {
  parseSceneUrl,
  removeSceneParamFromUrl,
} from '@/core/persistence/scene-url'
import { runStartupBootstrap } from './startup-bootstrap'
import { runStartupRestoreFlow, validateDraftState } from './restore-flow'
import {
  applyRestorableState,
  isRestorableStateAtDefaults,
  resolveFinishContext,
} from './restore-state'

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
  // A queued focus directive describes the pre-reset world; the surface claim
  // re-syncs from real focus events.
  resetFocusStore()
  resetToolbarGeometryStore()
  resetToolbarInteractionStore()
  clearSceneServices()
  // Pending feedback is stale scene state too: clear announcements and close
  // toasts so nothing describes the pre-reset world.
  feedback.reset()
}

function runRestoreOnce() {
  const finishContext = resolveFinishContext()
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

  runStartupRestoreFlow({
    parseResult,
    catalog: finishContext.catalog,
    validDraftState: validateDraftState(draftState, finishContext.catalog),
    applyState: (state) => {
      applyRestorableState(state, finishContext)
    },
    isFreshState: (state) => isRestorableStateAtDefaults(state, finishContext),
  })
}

/**
 * Assets are ready. Runs the restore flow (shared link -> draft -> defaults)
 * once per startup cycle, guarded by the attempt count so a Scene remount does
 * not re-run it. A retry resets the count (requestRetry): the error path wiped
 * the document, so the fresh cycle must restore the draft again.
 */
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
  // The InitializationError overlay is the only feedback surface here.
  resetStartupShell()
}

export function notifyAssetError(error: Error) {
  reportStartupError('asset-load', error)
}

/**
 * One of the app's own lazy chunks (engine, chrome) failed to fetch. Kept as a
 * distinct kind because its recovery differs: the retry reloads the page (see
 * startup-chunk-retry) rather than re-requesting assets in place.
 */
export function notifyChunkLoadError(error: Error) {
  reportStartupError('app-chunk', error)
}

export function requestAssetRetry() {
  dialogActions.closeActiveDialog()
  resetStartupShell()
  // Only reset the collection pipeline on an explicit retry (which remounts the
  // loader via the cycle), not on the error path: a gated failure's `failed`
  // mark must survive so the loader does not immediately re-attempt and loop.
  resetCollectionPipeline()

  editorLifecycleActions.requestRetry()
  runStartupBootstrap()
}
