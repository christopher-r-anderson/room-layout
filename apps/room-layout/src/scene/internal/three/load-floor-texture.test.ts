import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FloorFinishOption } from '@/domain/environment-materials'

interface MockTexture {
  colorSpace: unknown
  repeat: { set: ReturnType<typeof vi.fn> }
  wrapS: unknown
  wrapT: unknown
}

type LoadPlan =
  | { type: 'resolve'; texture: MockTexture }
  | { type: 'reject'; error: Error }

let loadPlans: LoadPlan[] = []
let loadCallUrls: string[] = []
const mockDetectSupport = vi.fn()
const mockSetWorkerLimit = vi.fn()

function createMockTexture(): MockTexture {
  return {
    colorSpace: null,
    repeat: {
      set: vi.fn(),
    },
    wrapS: null,
    wrapT: null,
  }
}

vi.mock('three', () => {
  class TextureLoader {
    load(
      url: string,
      onLoad: (value: MockTexture) => void,
      _onProgress: unknown,
      onError: (error: Error) => void,
    ) {
      loadCallUrls.push(url)

      const plan = loadPlans.shift()
      if (!plan) {
        throw new Error('Missing texture load plan in test')
      }

      if (plan.type === 'reject') {
        onError(plan.error)
        return
      }

      onLoad(plan.texture)
    }
  }

  return {
    NoColorSpace: Symbol('NoColorSpace'),
    RepeatWrapping: Symbol('RepeatWrapping'),
    SRGBColorSpace: Symbol('SRGBColorSpace'),
    TextureLoader,
  }
})

vi.mock('three/addons/loaders/KTX2Loader.js', () => {
  class KTX2Loader {
    setWorkerLimit(limit: number) {
      mockSetWorkerLimit(limit)
      return this
    }

    detectSupport(renderer: unknown) {
      mockDetectSupport(renderer)
      return this
    }

    loadAsync(url: string) {
      loadCallUrls.push(url)

      const plan = loadPlans.shift()
      if (!plan) {
        throw new Error('Missing texture load plan in test')
      }

      if (plan.type === 'reject') {
        return Promise.reject(plan.error)
      }

      return Promise.resolve(plan.texture)
    }
  }

  return { KTX2Loader }
})

describe('loadFloorTexture', () => {
  beforeEach(() => {
    vi.resetModules()
    loadPlans = []
    loadCallUrls = []
    mockDetectSupport.mockClear()
    mockSetWorkerLimit.mockClear()
  })

  it('retries after a failed load instead of caching a rejected promise', async () => {
    const option: FloorFinishOption = {
      id: 'wood-floor',
      label: 'Wood',
      diffusePath: '/environment/textures/wood-floor_diff_2k.ktx2',
      normalPath: '/environment/textures/wood-floor_nor_gl_1k.ktx2',
      tileSizeMeters: {
        width: 0.5,
        depth: 0.5,
      },
    }

    loadPlans = [
      { type: 'reject', error: new Error('transient network failure') },
      { type: 'resolve', texture: createMockTexture() },
      { type: 'resolve', texture: createMockTexture() },
      { type: 'resolve', texture: createMockTexture() },
    ]

    const module = await import('./load-floor-texture')
    const mockRenderer = {} as never

    await expect(module.loadFloorTexture(option, mockRenderer)).rejects.toThrow(
      'transient network failure',
    )

    const retryResult = await module.loadFloorTexture(option, mockRenderer)

    expect(retryResult.diffuse).toBeDefined()
    expect(retryResult.normal).toBeDefined()

    expect(loadCallUrls).toEqual([
      '/environment/textures/wood-floor_diff_2k.ktx2',
      '/environment/textures/wood-floor_nor_gl_1k.ktx2',
      '/environment/textures/wood-floor_diff_2k.ktx2',
      '/environment/textures/wood-floor_nor_gl_1k.ktx2',
    ])
    expect(mockDetectSupport).toHaveBeenCalledTimes(1)
  })

  it('falls back to TextureLoader for non-ktx2 paths', async () => {
    const option: FloorFinishOption = {
      id: 'fallback-floor',
      label: 'Fallback',
      diffusePath: '/environment/textures/fallback-floor_diff_2k.jpg',
      normalPath: '/environment/textures/fallback-floor_nor_gl_1k.png',
      tileSizeMeters: {
        width: 0.75,
        depth: 0.75,
      },
    }

    loadPlans = [
      { type: 'resolve', texture: createMockTexture() },
      { type: 'resolve', texture: createMockTexture() },
    ]

    const module = await import('./load-floor-texture')

    await module.loadFloorTexture(option, {} as never)

    expect(loadCallUrls).toEqual([
      '/environment/textures/fallback-floor_diff_2k.jpg',
      '/environment/textures/fallback-floor_nor_gl_1k.png',
    ])
  })
})
