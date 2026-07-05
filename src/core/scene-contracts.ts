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

// Collection-loading seam: the scene loader reports parse outcomes back to the
// core loading store, and the Scene observes gated-collection failures. The
// parsed scene objects themselves stay scene-internal (collection-scene-registry).
export {
  collectionLoadingActions,
  isCollectionLoaded,
  isCollectionFailed,
  useFailedCollections,
} from './stores/collection-loading-store'
