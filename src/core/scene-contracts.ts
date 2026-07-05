/**
 * Narrow surface that scene code may import from core.
 * All other core modules are off-limits to the scene.
 *
 * When adding new exports here, also update the ESLint allow-list
 * in eslint.config.js (the scene restriction block).
 */
export {
  sceneDocumentActions,
  sceneDocumentStore,
  useItems,
  useSelectedId,
} from './stores/scene-document-store'

export { toolbarGeometryActions } from './stores/toolbar-geometry-store'

// The Scene reports its own mount/unmount so core can gate startup readiness on the
// canvas actually being up (avoids lifting the loading overlay before first paint).
export { setSceneMounted } from './stores/editor-lifecycle-store'

// Collection-loading seam: the scene loader reports parse outcomes (loaded/failed)
// back to the core loading store. The parsed scene objects themselves stay
// scene-internal (collection-scene-registry).
export {
  collectionLoadingActions,
  isCollectionLoaded,
  isCollectionFailed,
} from './stores/collection-loading-store'
