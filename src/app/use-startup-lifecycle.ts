import { useCallback, type RefObject } from 'react'
import type { SceneRef } from '@/scene/scene.types'
import { useStartupState } from './startup/use-startup-state'
import { runStartupReset } from './startup/reset-startup-state'

interface UseStartupLifecycleOptions {
  sceneRef: RefObject<SceneRef | null>
  resetOverlayState: () => void
}

interface StartupLifecycle {
  assetError: Error | null
  assetErrorRef: RefObject<Error | null>
  assetsReadyRef: RefObject<boolean>
  editorInteractionsEnabled: boolean
  sceneVersion: number
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
    assetErrorRef,
    assetsReadyRef,
    editorInteractionsEnabled,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    sceneVersion,
    startupLoadingActive,
    startupOverlayActive,
  } = useStartupState()

  const resetEditorShellState = useCallback(() => {
    runStartupReset({ resetOverlayState, sceneRef })
  }, [resetOverlayState, sceneRef])

  return {
    assetError,
    assetErrorRef,
    assetsReadyRef,
    editorInteractionsEnabled,
    sceneVersion,
    startupLoadingActive,
    startupOverlayActive,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    resetEditorShellState,
  }
}
