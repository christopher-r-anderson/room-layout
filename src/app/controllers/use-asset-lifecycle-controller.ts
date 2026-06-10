import { useCallback, useRef } from 'react'
import type { DialogStateSnapshot } from '@/editor-state/dialog-store'
import { editorRuntimeActions } from '@/editor-state/editor-runtime-store'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import {
  runStartupAssetErrorTransition,
  runStartupRetryTransition,
} from '@/app/startup/startup-transitions'
import {
  SCENE_URL_PARAM,
  parseSceneUrl,
  validateCatalogReferences,
} from '@/app/url-scene/scene-url'
import { loadSceneDraft, saveSceneDraft } from '@/app/url-scene/scene-draft'
import { createDefaultSceneState } from '@/app/startup/scene-defaults'
import { isSceneStateAtDefaults } from '@/lib/three/scene-model'
import { sceneCommands } from '@/scene/scene-commands'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import { toast } from 'sonner'
import { runStartupRestoreFlow } from './_shared/restore-flow'
import type { RestorableState } from './_shared/restore-flow.types'
import type { SelectionEffectsApi } from './use-selection-effects-controller'

interface AnnouncementsApi {
  announcePolite: (message: string) => void
  announceAssertive: (message: string) => void
  clearAssertiveAnnouncement: () => void
}

interface AssetLifecycleControllerOptions {
  announcements: AnnouncementsApi
  dialogState: Pick<DialogStateSnapshot, 'closeAllDialogs'>
  selectionEffects: SelectionEffectsApi
  startup: {
    catalog: FurnitureCatalogEntry[]
    defaultFloorFinishId: string
    defaultWallFinishId: string
    floorFinishIds: string[]
    wallFinishIds: string[]
    handleAssetError: (error: Error) => void
    handleAssetsReady: () => void
    retryAssetLoading: () => void
    resetEditorShellState: () => void
  }
}

export function useAssetLifecycleController({
  announcements,
  dialogState,
  selectionEffects,
  startup,
}: AssetLifecycleControllerOptions) {
  const restoreAttemptedRef = useRef(false)

  const handleSceneAssetError = useCallback(
    (error: Error) => {
      runStartupAssetErrorTransition(error, {
        markRuntimeAssetError: (runtimeError) => {
          editorRuntimeActions.setAssetError({
            kind: 'asset-load',
            message: runtimeError.message,
          })
        },
        closeAllDialogs: dialogState.closeAllDialogs,
        recordAssetError: startup.handleAssetError,
        resetEditorShellState: startup.resetEditorShellState,
      })
      toast.error('Unable to load room editor assets. Retry available.')
      announcements.announceAssertive(
        'Unable to load room editor assets. Retry available.',
      )
    },
    [announcements, dialogState, startup],
  )

  const handleSceneAssetsReady = useCallback(() => {
    if (!restoreAttemptedRef.current) {
      restoreAttemptedRef.current = true
      editorRuntimeActions.incrementRestoreAttempt()

      const draftState = loadSceneDraft()
      const parseResult = parseSceneUrl(window.location.href)
      const shouldCleanupSceneParam = parseResult.ok
        ? true
        : parseResult.reason !== 'no-param'

      if (shouldCleanupSceneParam) {
        try {
          const url = new URL(window.location.href)

          while (url.searchParams.has(SCENE_URL_PARAM)) {
            url.searchParams.delete(SCENE_URL_PARAM)
          }

          window.history.replaceState(window.history.state, '', url.toString())
        } catch {
          // Ignore malformed URL/state failures and continue restore flow.
        }
      }

      const applyFinishIds = (
        floorFinishId: string | undefined,
        wallFinishId: string | undefined,
      ) => {
        if (floorFinishId && startup.floorFinishIds.includes(floorFinishId)) {
          sceneStateActions.setFloorFinishId(floorFinishId)
        }

        if (wallFinishId && startup.wallFinishIds.includes(wallFinishId)) {
          sceneStateActions.setWallFinishId(wallFinishId)
        }
      }

      const normalizeRestoredState = (state: RestorableState) => {
        const normalizedFloorFinishId = startup.floorFinishIds.includes(
          state.floorFinishId ?? '',
        )
          ? state.floorFinishId
          : startup.defaultFloorFinishId
        const normalizedWallFinishId = startup.wallFinishIds.includes(
          state.wallFinishId ?? '',
        )
          ? state.wallFinishId
          : startup.defaultWallFinishId

        return {
          ...state,
          floorFinishId: normalizedFloorFinishId,
          wallFinishId: normalizedWallFinishId,
        }
      }

      const applyRestoredState = (state: RestorableState) => {
        const normalizedState = normalizeRestoredState(state)

        sceneCommands.restoreInitialLayout(normalizedState.items)
        applyFinishIds(
          normalizedState.floorFinishId,
          normalizedState.wallFinishId,
        )
        saveSceneDraft(normalizedState.items, {
          floorFinishId: normalizedState.floorFinishId,
          wallFinishId: normalizedState.wallFinishId,
        })
      }

      const validDraftState =
        draftState &&
        validateCatalogReferences(draftState.items, startup.catalog)
          ? draftState
          : null

      const defaultSceneState = createDefaultSceneState({
        defaultFloorFinishId: startup.defaultFloorFinishId,
        defaultWallFinishId: startup.defaultWallFinishId,
      })

      runStartupRestoreFlow({
        parseResult,
        catalog: startup.catalog,
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
          announcePolite: announcements.announcePolite,
          announceAssertive: announcements.announceAssertive,
          setEditorMessage: sceneStateActions.setEditorMessage,
          setRestoreOutcome: editorRuntimeActions.recordRestoreOutcome,
          toastSuccess: (message) => toast.success(message),
          toastWarning: (message) => toast.warning(message),
          toastError: (message) => toast.error(message),
        },
      })
    }

    selectionEffects.notePendingSelection({
      announceMode: 'suppress',
      requestOutlinerFocus: false,
    })

    startup.handleAssetsReady()
  }, [announcements, selectionEffects, startup])

  const handleRetryAssetLoading = useCallback(() => {
    runStartupRetryTransition({
      closeAllDialogs: dialogState.closeAllDialogs,
      resetEditorShellState: startup.resetEditorShellState,
      retryAssetLoading: startup.retryAssetLoading,
    })
    announcements.clearAssertiveAnnouncement()
  }, [announcements, dialogState, startup])

  return {
    handleSceneAssetError,
    handleSceneAssetsReady,
    handleRetryAssetLoading,
  }
}
