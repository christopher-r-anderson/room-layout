/**
 * Test-only core seam for scene tests.
 *
 * Scene production code must continue to import core only via
 * `@/core/scene-contracts`. Tests may use this module for setup and
 * reset helpers without reaching into individual store files.
 */
export { resetSceneStateStore } from './stores/scene-state-store'
