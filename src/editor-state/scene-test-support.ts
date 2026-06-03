/**
 * Test-only editor-state seam for scene tests.
 *
 * Scene production code must continue to import editor-state only via
 * `@/editor-state/scene-contracts`. Tests may use this module for setup and
 * reset helpers without reaching into individual store files.
 */
export { resetSceneStateStore } from './scene-state-store'
