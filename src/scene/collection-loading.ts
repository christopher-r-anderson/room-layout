// Public contract for on-demand furniture-collection loading. Separate from
// scene-commands (the scene-services imperative surface) because loading is
// store-backed - it does not go through the registered scene services and has no
// ready-scene requirement. App / features / core drive on-demand loads and read
// their state through here.
export {
  ensureCollectionLoaded,
  getCollectionFailureKind,
  resetCollectionScenes,
  useActiveOnDemandCollectionPaths,
  useFailedCollections,
} from './internal/furniture/collection-scenes-store'
