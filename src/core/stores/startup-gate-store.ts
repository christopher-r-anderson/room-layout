import { useStoreWithEqualityFn } from 'zustand/traditional'
import { createStore } from 'zustand/vanilla'
import { shallow } from 'zustand/shallow'

// The gated set: the collections the restored scene references, which startup must
// load before the editor unlocks (empty for a fresh scene). Everything else in the
// catalog loads on demand. See docs/architecture/startup-and-asset-loading.md.
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
