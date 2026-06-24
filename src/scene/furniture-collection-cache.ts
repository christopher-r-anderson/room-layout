import { useGLTF, useProgress } from '@react-three/drei'

export function preloadFurnitureCollections(paths: string[]) {
  useGLTF.preload(paths)
}

export function clearFurnitureCollectionCache(paths: string[]) {
  useGLTF.clear(paths)
}

export interface FurnitureAssetLoadingProgress {
  /** True while furniture asset requests are in flight. */
  active: boolean
  /** Count of assets that have finished loading. */
  loaded: number
  /** Total assets requested. */
  total: number
  /** Completion percentage in the range 0–100, guaranteed finite. */
  percent: number
  /** URL of the asset currently loading, or '' before the first request. */
  currentItem: string
}

/**
 * Status half of the furniture-collection asset lifecycle: reports load
 * progress for the assets started by {@link preloadFurnitureCollections}. Keeps
 * the loader source (currently the three.js loading manager) owned by scene so
 * callers render progress without depending on how assets are loaded.
 */
export function useFurnitureAssetLoadingProgress(): FurnitureAssetLoadingProgress {
  const { active, item, loaded, progress, total } = useProgress()
  const percent = Number.isNaN(progress)
    ? 0
    : Math.max(0, Math.min(100, progress))

  return { active, loaded, total, percent, currentItem: item }
}
