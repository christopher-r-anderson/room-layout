import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearSceneServices,
  getSceneServices,
  getSceneServicesIfReady,
  registerSceneServices,
} from './scene-services'
import type { SceneServices } from './scene-services'
import {
  resetEditorLifecycleStore,
  useEditorLifecycleStore,
} from './stores/editor-lifecycle-store'

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
    resetEditorLifecycleStore()
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

  it('drives the reactive sceneReady flag through register and clear', () => {
    expect(useEditorLifecycleStore.getState().sceneReady).toBe(false)

    registerSceneServices(createFakeServices())
    expect(useEditorLifecycleStore.getState().sceneReady).toBe(true)

    clearSceneServices()
    expect(useEditorLifecycleStore.getState().sceneReady).toBe(false)
  })

  it('keeps the flag mirroring the registry across a lifecycle-store reset', () => {
    registerSceneServices(createFakeServices())

    resetEditorLifecycleStore()

    // The store reset leaves sceneReady to its producer: with the services
    // still registered, the flag must keep agreeing with isSceneReady().
    expect(useEditorLifecycleStore.getState().sceneReady).toBe(true)
    expect(getSceneServicesIfReady()).not.toBeNull()

    clearSceneServices()
    expect(useEditorLifecycleStore.getState().sceneReady).toBe(false)
  })

  it('has the services in place before a sceneReady subscriber is notified', () => {
    const observedRegistries: (SceneServices | null)[] = []
    const unsubscribe = useEditorLifecycleStore.subscribe(
      (state) => state.sceneReady,
      () => {
        observedRegistries.push(getSceneServicesIfReady())
      },
    )

    try {
      const services = createFakeServices()
      registerSceneServices(services)
      clearSceneServices()

      // Register notified with the registry populated; clear with it emptied -
      // a subscriber woken by the flag never observes a half-applied oracle.
      expect(observedRegistries).toEqual([services, null])
    } finally {
      unsubscribe()
    }
  })
})
