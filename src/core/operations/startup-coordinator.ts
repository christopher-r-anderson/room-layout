import { toast } from 'sonner'
import { createDefaultSceneState } from '@/core/model/scene-defaults'
import { isSceneStateAtDefaults } from '@/core/model/scene-model'
import { sceneCommands, clearSceneServices } from '@/scene/scene-commands'
import { clearFurnitureCollectionCache } from '@/scene/furniture-collection-cache'
import { feedbackActions } from '../stores/feedback-store'
import { dialogActions } from '../stores/dialog-store'
import {
  editorLifecycleActions,
  editorLifecycleStore,
} from '../stores/editor-lifecycle-store'
import { assetsStore } from '../stores/assets-store'
import { sceneDocumentActions } from '../stores/scene-document-store'
import { resetSelectionFocusStore } from '../stores/selection-focus-store'
import { resetToolbarGeometryStore } from '../stores/toolbar-geometry-store'
import { selectionEffects } from './selection-effects'
import { loadSceneDraft, saveSceneDraft } from '../persistence/scene-draft'
import {
  parseSceneUrl,
  removeSceneParamFromUrl,
  validateCatalogReferences,
} from '../persistence/scene-url'
import { runStartupRestoreFlow } from '../persistence/restore-flow'
import type { RestorableState } from '../persistence/restore-flow.types'

const ASSET_ERROR_MESSAGE =
  'Unable to load room editor assets. Retry available.'

// Resets the editor surface back to a clean slate. Used by the asset-error and
// retry transitions so a failed or restarted load never leaves stale scene or
// selection state behind.
function resetStartupShell() {
  sceneDocumentActions.resetSceneDocument()
  resetSelectionFocusStore()
  resetToolbarGeometryStore()
  clearSceneServices()
}

function resolveFinishContext() {
  const { catalog, environmentConfig } = assetsStore.getState()

  return {
    catalog,
    defaultFloorFinishId: environmentConfig?.defaultFloorFinishId ?? '',
    defaultWallFinishId: environmentConfig?.defaultWallFinishId ?? '',
    floorFinishIds:
      environmentConfig?.floorFinishes.map((option) => option.id) ?? [],
    wallFinishIds:
      environmentConfig?.wallFinishes.map((option) => option.id) ?? [],
  }
}

function runRestoreOnce() {
  const finish = resolveFinishContext()
  const { catalog, defaultFloorFinishId, defaultWallFinishId } = finish

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
  ) => {
    if (floorFinishId && finish.floorFinishIds.includes(floorFinishId)) {
      sceneDocumentActions.setFloorFinishId(floorFinishId)
    }

    if (wallFinishId && finish.wallFinishIds.includes(wallFinishId)) {
      sceneDocumentActions.setWallFinishId(wallFinishId)
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

    return {
      ...state,
      floorFinishId: normalizedFloorFinishId,
      wallFinishId: normalizedWallFinishId,
    }
  }

  const applyRestoredState = (state: RestorableState) => {
    const normalizedState = normalizeRestoredState(state)

    sceneCommands.restoreInitialLayout(normalizedState.items)
    applyFinishIds(normalizedState.floorFinishId, normalizedState.wallFinishId)
    saveSceneDraft(normalizedState.items, {
      floorFinishId: normalizedState.floorFinishId,
      wallFinishId: normalizedState.wallFinishId,
    })
  }

  const validDraftState =
    draftState && validateCatalogReferences(draftState.items, catalog)
      ? draftState
      : null

  const defaultSceneState = createDefaultSceneState({
    defaultFloorFinishId,
    defaultWallFinishId,
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
        },
        defaultSceneState,
      )
    },
    notifications: {
      announcePolite: feedbackActions.announcePolite,
      announceAssertive: feedbackActions.announceAssertive,
      setStatusMessage: feedbackActions.setStatusMessage,
      setRestoreOutcome: editorLifecycleActions.recordRestoreOutcome,
      toastSuccess: (message) => toast.success(message),
      toastWarning: (message) => toast.warning(message),
      toastError: (message) => toast.error(message),
    },
  })
}

// The scene reported its assets are ready. On the first ready notification of a
// session, run the one-time restore flow (shared link → draft → defaults); on
// every notification, suppress the pending-selection announcement and mark the
// editor ready. The restore is guarded by the lifecycle store's attempt count so
// it does not re-run on a Scene remount or after a retry.
export function completeAssetLoad() {
  if (editorLifecycleStore.getState().restoreAttemptCount === 0) {
    editorLifecycleActions.incrementRestoreAttempt()
    runRestoreOnce()
  }

  selectionEffects.notePendingSelection({
    announceMode: 'suppress',
    requestOutlinerFocus: false,
  })

  editorLifecycleActions.markAssetsReady()
}

// The scene failed to load assets. Record the asset error, dismiss any open
// dialog, reset the surface, and surface the failure to the user.
export function notifyAssetError(error: Error) {
  editorLifecycleActions.setAssetError({
    kind: 'asset-load',
    message: error.message,
  })
  dialogActions.closeActiveDialog()
  resetStartupShell()
  toast.error(ASSET_ERROR_MESSAGE)
  feedbackActions.announceAssertive(ASSET_ERROR_MESSAGE)
}

// The user asked to retry startup. Clear any open dialog and the surface, drop
// the cached GLTFs for the loaded collections, then bump the lifecycle retry
// token so the bootstrap fetch effect re-runs and the Scene remounts.
export function requestAssetRetry() {
  dialogActions.closeActiveDialog()
  resetStartupShell()

  const paths = assetsStore
    .getState()
    .collections.map((collection) => collection.sourcePath)
  clearFurnitureCollectionCache(paths)

  editorLifecycleActions.requestRetry()
  feedbackActions.clearAssertiveAnnouncement()
}
