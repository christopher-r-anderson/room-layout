// Public scene surface for the parsed-collection registry. Core drives collection
// loading (see @/core/stores/collection-loading-store) and owns the retry
// teardown; the parsed scene objects are the one piece that must live in the scene
// layer, so this exposes just the registry reset for that teardown to call.
export { resetCollectionSceneRegistry } from './internal/furniture/collection-scene-registry'
