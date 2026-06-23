/**
 * Narrow surface that scene code may import from core.
 * All other core modules are off-limits to the scene.
 *
 * When adding new exports here, also update the ESLint allow-list
 * in eslint.config.js (the scene restriction block).
 */
export {
  sceneStateActions,
  sceneStateStore,
  useItems,
  useSelectedId,
} from './stores/scene-state-store'

export { selectionMetaActions } from './stores/selection-meta-store'
