import { useStoreWithEqualityFn } from 'zustand/traditional'
import { createStore } from 'zustand/vanilla'

// Download progress (0-100) for on-demand furniture-collection loads, keyed by
// sourcePath. The Add drawer reads the selected item's collection here to show a
// determinate "Adding... N%" while its model streams in. Separate from the gated
// startup prefetch progress, which drives the startup loader.
interface CollectionLoadProgressState {
  percentByPath: Map<string, number>
}

const collectionLoadProgressStore = createStore<CollectionLoadProgressState>()(
  () => ({
    percentByPath: new Map<string, number>(),
  }),
)

export const collectionLoadProgressActions = {
  setPercent(path: string, percent: number) {
    collectionLoadProgressStore.setState((state) => {
      const percentByPath = new Map(state.percentByPath)
      percentByPath.set(path, percent)
      return { percentByPath }
    })
  },
  clear(path: string) {
    collectionLoadProgressStore.setState((state) => {
      if (!state.percentByPath.has(path)) {
        return state
      }
      const percentByPath = new Map(state.percentByPath)
      percentByPath.delete(path)
      return { percentByPath }
    })
  },
}

// The download percent for a collection, or null when it is not actively loading
// (not started, or already finished/cleared).
export function useCollectionLoadPercent(path: string | null): number | null {
  return useStoreWithEqualityFn(collectionLoadProgressStore, (state) =>
    path ? (state.percentByPath.get(path) ?? null) : null,
  )
}
