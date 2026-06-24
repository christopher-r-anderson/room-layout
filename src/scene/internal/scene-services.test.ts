import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSceneServices,
  getSceneServices,
  registerSceneServices,
} from './scene-services'
import type { SceneServices } from './scene-services'

function createFakeServices(): SceneServices {
  return {
    addFurniture: () => ({ ok: true as const, id: 'item-1' }),
    clearSelection: () => undefined,
    deleteSelection: () => true,
    focusSelected: () => undefined,
    getCameraPosition: () => [0, 0, 0] as [number, number, number],
    getSnapshot: () => ({
      cameraPosition: [0, 0, 0] as [number, number, number],
      items: [],
    }),
    moveSelection: () => ({
      ok: false as const,
      reason: 'no-selection' as const,
    }),
    redo: () => true,
    restoreInitialLayout: () => undefined,
    rotateSelection: () => undefined,
    selectById: () => ({ ok: true as const, status: 'selected' as const }),
    setCameraKeyState: () => undefined,
    setCameraPreset: () => undefined,
    setSelectionTransform: () => ({
      ok: false as const,
      reason: 'no-selection' as const,
    }),
    undo: () => true,
  }
}

describe('scene-services', () => {
  beforeEach(() => {
    clearSceneServices()
  })

  it('throws when services are requested before registration', () => {
    expect(() => getSceneServices()).toThrow('scene services not registered')
  })

  it('returns registered services synchronously', () => {
    const services = createFakeServices()

    registerSceneServices(services)

    expect(getSceneServices()).toBe(services)
  })
})
