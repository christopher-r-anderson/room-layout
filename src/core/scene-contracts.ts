/**
 * Narrow surface that scene code may import from core.
 * All other core modules are off-limits to the scene.
 *
 * When adding new exports here, also update the ESLint allow-list
 * in eslint.config.js (the scene restriction block).
 */
export {
  sceneDocumentActions,
  useSceneDocumentStore,
  useItems,
  useSelectedId,
} from './stores/scene-document-store'

export { toolbarGeometryActions } from './stores/toolbar-geometry-store'

// The Scene reports its own mount/unmount so core can gate startup readiness on the
// canvas actually being up (avoids lifting the loading overlay before first paint).
export { setSceneMounted } from './stores/editor-lifecycle-store'
