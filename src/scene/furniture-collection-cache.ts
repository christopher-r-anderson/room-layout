import { useGLTF } from '@react-three/drei'

export function preloadFurnitureCollections(paths: string[]) {
  useGLTF.preload(paths)
}

export function clearFurnitureCollectionCache(paths: string[]) {
  useGLTF.clear(paths)
}
