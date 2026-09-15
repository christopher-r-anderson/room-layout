import { afterEach, expect, it, vi } from 'vitest'
import { clearSceneServices, registerSceneServices } from './scene-services'
import { sceneCommands } from './scene-commands'

function registerDefaultSceneServices(
  overrides: Partial<Parameters<typeof registerSceneServices>[0]> = {},
) {
  registerSceneServices({
    focusSelected: () => undefined,
    loadCollectionScene: () => Promise.resolve(),
    getSnapshot: () => ({
      cameraPosition: [0, 0, 0] as [number, number, number],
      items: [],
    }),
    setCameraKeyState: () => undefined,
    setCameraPreset: () => undefined,
    ...overrides,
  })
}

afterEach(() => {
  clearSceneServices()
})

it('delegates setCameraKeyState through registered scene services', () => {
  const setCameraKeyState = vi.fn()
  const keyState = new Set(['keyW'] as const)

  registerDefaultSceneServices({
    setCameraKeyState,
  })

  sceneCommands.setCameraKeyState(keyState)

  expect(setCameraKeyState).toHaveBeenCalledWith(keyState)
})

it('tracks scene readiness via registered services', () => {
  expect(sceneCommands.isSceneReady()).toBe(false)

  registerDefaultSceneServices()
  expect(sceneCommands.isSceneReady()).toBe(true)

  clearSceneServices()
  expect(sceneCommands.isSceneReady()).toBe(false)
})

it('reads getSnapshot through registered scene services', () => {
  const snapshot = {
    cameraPosition: [0, 0, 0] as [number, number, number],
    items: [],
  }

  registerDefaultSceneServices({
    getSnapshot: () => snapshot,
  })

  expect(sceneCommands.getSnapshot()).toBe(snapshot)
})

it('delegates focusSelected and setCameraPreset through registered scene services', () => {
  const focusSelected = vi.fn()
  const setCameraPreset = vi.fn()

  registerDefaultSceneServices({ focusSelected, setCameraPreset })

  sceneCommands.focusSelected()
  sceneCommands.setCameraPreset('top')

  expect(focusSelected).toHaveBeenCalledTimes(1)
  expect(setCameraPreset).toHaveBeenCalledWith('top')
})
