import { msg } from '@lingui/core/macro'
import { toast } from 'sonner'
import { createDefaultSceneState } from '@/core/model/scene-defaults'
import { isSceneStateAtDefaults } from '@/core/model/scene-model'
import { i18n } from '@/shared/i18n/i18n'
import { sceneCommands, clearSceneServices } from '@/scene/scene-commands'
import { resetCollectionSceneRegistry } from '@/scene/collection-registry'
import { resetCollectionLoading } from '@/core/stores/collection-loading-store'
import { clearCollectionBytes } from './collection-bytes'
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
import { resetToolbarInteractionStore } from '../stores/toolbar-interaction-store'
import { selectionEffects } from './selection-effects'
import { loadSceneDraft, saveSceneDraft } from '../persistence/scene-draft'
import {
  parseSceneUrl,
  removeSceneParamFromUrl,
  validateCatalogReferences,
} from '../persistence/scene-url'
import { runStartupRestoreFlow } from '../persistence/restore-flow'
import type { RestorableState } from '../persistence/restore-flow.types'

// Resets the editor surface back to a clean slate. Used by the asset-error and
// retry transitions so a failed or restarted load never leaves stale scene or
// selection state behind.
function resetStartupShell() {
  sceneDocumentActions.resetSceneDocument()
  resetSelectionFocusStore()
  resetToolbarGeometryStore()
  resetToolbarInteractionStore()
  clearSceneServices()
}

function resolveFinishContext() {
  const { catalog, environmentConfig } = assetsStore.getState()

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

    sceneCommands.restoreInitialLayout(normalizedState.items)
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

  const validDraftState =
    draftState && validateCatalogReferences(draftState.items, catalog)
      ? draftState
      : null

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
      toastSuccess: (message) => toast.success(message),
      toastWarning: (message) => toast.warning(message),
      toastError: (message) => toast.error(message),
    },
  })
}

// Assets are ready. Runs the one-time restore flow (shared link -> draft ->
// defaults) on the first ready of a session, guarded by the attempt count so a
// Scene remount or retry does not re-run it.
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

export function notifyAssetError(error: Error) {
  editorLifecycleActions.setAssetError({
    kind: 'asset-load',
    message: error.message,
  })
  dialogActions.closeActiveDialog()
  resetStartupShell()
  const assetError = i18n._(
    msg`Unable to load room editor assets. Retry available.`,
  )
  toast.error(assetError)
  feedbackActions.announceAssertive(assetError)
}

// Retry startup: drop the buffered asset bytes so it re-downloads, then bump the
// retry token so the bootstrap fetch re-runs and the Scene remounts.
export function requestAssetRetry() {
  dialogActions.closeActiveDialog()
  resetStartupShell()
  // Only reset collection state on an explicit retry (which remounts the loader
  // via the epoch), not on the error path: a gated failure's `failed` mark must
  // survive so the loader does not immediately re-attempt and loop. Clears the core
  // loading lifecycle and the scene's parsed-collection registry together.
  resetCollectionLoading()
  resetCollectionSceneRegistry()
  clearCollectionBytes()

  editorLifecycleActions.requestRetry()
  feedbackActions.clearAssertiveAnnouncement()
}
