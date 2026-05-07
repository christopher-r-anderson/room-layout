import { useCallback, type RefObject } from 'react'
import type { SceneRef } from '@/scene/scene.types'
import { useStartupState } from './startup/use-startup-state'
import { runStartupReset } from './startup/reset-startup-state'
import type {
  FurnitureCatalogEntry,
  FurnitureCollection,
} from '@/scene/objects/furniture-catalog'
import type { StartupErrorKind } from './startup/use-startup-state'

interface UseStartupLifecycleOptions {
  sceneRef: RefObject<SceneRef | null>
  resetOverlayState: () => void
}

interface StartupLifecycle {
  assetError: Error | null
  assetErrorKind: StartupErrorKind | null
  assetErrorRef: RefObject<Error | null>
  assetsReadyRef: RefObject<boolean>
  catalog: FurnitureCatalogEntry[]
  collections: FurnitureCollection[]
  editorInteractionsEnabled: boolean
  cacheInvalidationKey: number
  startupLoadingActive: boolean
  startupOverlayActive: boolean
  handleAssetError: (error: Error) => void
  handleAssetsReady: () => void
  retryAssetLoading: () => void
  resetEditorShellState: () => void
}

/**
 * Coordinator hook for the startup domain: wraps useStartupState and creates
 * resetEditorShellState. The full scene event handlers (handleSceneAssetError,
 * handleSceneAssetsReady, handleRetryAssetLoading) live in useSceneHandlers,
 * which has access to closeAllDialogs and syncSceneReadModel without requiring
 * circular forwarder refs. Consumed only by App.tsx.
 */
export function useStartupLifecycle({
  sceneRef,
  resetOverlayState,
}: UseStartupLifecycleOptions): StartupLifecycle {
  const {
    assetError,
    assetErrorKind,
    assetErrorRef,
    assetsReadyRef,
    catalog,
    collections,
    editorInteractionsEnabled,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    cacheInvalidationKey,
    startupLoadingActive,
    startupOverlayActive,
  } = useStartupState()

  const resetEditorShellState = useCallback(() => {
    runStartupReset({ resetOverlayState, sceneRef })
  }, [resetOverlayState, sceneRef])

  return {
    assetError,
    assetErrorKind,
    assetErrorRef,
    assetsReadyRef,
    catalog,
    collections,
    editorInteractionsEnabled,
    cacheInvalidationKey,
    startupLoadingActive,
    startupOverlayActive,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    resetEditorShellState,
  }
}
