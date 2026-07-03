import { useStoreWithEqualityFn } from 'zustand/traditional'
import { createStore } from 'zustand/vanilla'
import { shallow } from 'zustand/shallow'

// The collection GLBs the current startup must load before the editor unlocks:
// the collections referenced by the restored scene (shared link / local draft),
// or empty for a fresh/empty scene. Bootstrap computes this from the manifest +
// restore source; scene-canvas reads it to prefetch/seed the gated set and to
// gate the Scene's readiness. Everything else in the catalog loads lazily on
// demand and is not part of this set.
interface StartupGateState {
  gatedCollectionPaths: string[]
}

const startupGateStore = createStore<StartupGateState>()(() => ({
  gatedCollectionPaths: [],
}))

export const startupGateActions = {
  setGatedCollectionPaths(paths: string[]) {
    startupGateStore.setState({ gatedCollectionPaths: paths })
  },
}

export function useGatedCollectionPaths(): string[] {
  return useStoreWithEqualityFn(
    startupGateStore,
    (state) => state.gatedCollectionPaths,
    shallow,
  )
}
