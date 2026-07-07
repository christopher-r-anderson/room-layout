import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSceneServices,
  getSceneServices,
  getSceneServicesIfReady,
  registerSceneServices,
} from './scene-services'
import type { SceneServices } from './scene-services'

function createFakeServices(): SceneServices {
  return {
    focusSelected: () => undefined,
    getSnapshot: () => ({
      cameraPosition: [0, 0, 0] as [number, number, number],
      items: [],
    }),
    loadCollectionScene: () => Promise.resolve(),
    setCameraKeyState: () => undefined,
    setCameraPreset: () => undefined,
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

  it('reports readiness through getSceneServicesIfReady without throwing', () => {
    expect(getSceneServicesIfReady()).toBeNull()

    const services = createFakeServices()
    registerSceneServices(services)

    expect(getSceneServicesIfReady()).toBe(services)
  })

  it('clears registered services', () => {
    registerSceneServices(createFakeServices())

    clearSceneServices()

    expect(getSceneServicesIfReady()).toBeNull()
    expect(() => getSceneServices()).toThrow('scene services not registered')
  })
})
