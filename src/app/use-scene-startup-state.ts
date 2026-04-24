import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import {
  clearFurnitureCollectionCache,
  preloadFurnitureCollections,
} from '@/scene/objects/furniture-catalog'

interface SceneStartupState {
  assetError: Error | null
  assetErrorRef: RefObject<Error | null>
  assetsReady: boolean
  assetsReadyRef: RefObject<boolean>
  editorInteractionsEnabled: boolean
  handleAssetError: (error: Error) => void
  handleAssetsReady: () => void
  retryAssetLoading: () => void
  sceneVersion: number
  startupLoadingActive: boolean
  startupOverlayActive: boolean
}

export function useSceneStartupState(): SceneStartupState {
  const [assetsReady, setAssetsReady] = useState(false)
  const [assetError, setAssetError] = useState<Error | null>(null)
  const [sceneVersion, setSceneVersion] = useState(0)
  const assetsReadyRef = useRef(assetsReady)
  const assetErrorRef = useRef(assetError)

  const editorInteractionsEnabled = assetsReady && assetError === null
  const startupLoadingActive = !assetsReady && assetError === null
  const startupOverlayActive = startupLoadingActive || assetError !== null

  useEffect(() => {
    preloadFurnitureCollections()
  }, [])

  useEffect(() => {
    assetsReadyRef.current = assetsReady
  }, [assetsReady])

  useEffect(() => {
    assetErrorRef.current = assetError
  }, [assetError])

  const handleAssetsReady = useCallback(() => {
    setAssetsReady(true)
    setAssetError(null)
  }, [])

  const handleAssetError = useCallback((error: Error) => {
    setAssetsReady(false)
    setAssetError(error)
  }, [])

  const retryAssetLoading = useCallback(() => {
    clearFurnitureCollectionCache()
    setAssetsReady(false)
    setAssetError(null)
    setSceneVersion((currentVersion) => currentVersion + 1)
  }, [])

  return {
    assetError,
    assetErrorRef,
    assetsReady,
    assetsReadyRef,
    editorInteractionsEnabled,
    handleAssetError,
    handleAssetsReady,
    retryAssetLoading,
    sceneVersion,
    startupLoadingActive,
    startupOverlayActive,
  }
}
