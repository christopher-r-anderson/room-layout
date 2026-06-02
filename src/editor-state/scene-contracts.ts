/**
 * Narrow surface that scene code may import from editor-state.
 * All other editor-state modules are off-limits to the scene.
 *
 * When adding new exports here, also update the ESLint allow-list
 * in eslint.config.js (the scene restriction block).
 */
export {
  sceneStateActions,
  sceneStateStore,
  useItems,
  useSelectedId,
} from './scene-state-store'

export { selectionMetaActions } from './selection-meta-store'
