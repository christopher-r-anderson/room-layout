/**
 * Test-only scene seam. Tests register fake scene services and tear them down
 * here instead of reaching into scene internals (`internal/scene-services`).
 *
 * Production code never registers services — only the Scene component does — and
 * resets the registry via `clearSceneServices` from `scene-commands`. This pair
 * is the scene-services test harness: `register` seeds fakes, `clear` removes
 * them.
 */
export {
  registerSceneServices,
  clearSceneServices,
} from './internal/scene-services'
