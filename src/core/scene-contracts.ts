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

export { selectionMetaActions } from './stores/selection-meta-store'
