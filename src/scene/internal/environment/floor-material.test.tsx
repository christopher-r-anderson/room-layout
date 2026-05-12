// @vitest-environment jsdom
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MeshStandardMaterial, Texture } from 'three'
import { createR3FTestScene } from '@/test/r3f-renderer'
import type { FloorFinishOption } from '@/lib/three/environment-materials'
import { FloorMaterial } from './floor-material'

const { mockLoadFloorTexture } = vi.hoisted(() => ({
  mockLoadFloorTexture: vi.fn(),
}))

vi.mock('@/lib/three/load-floor-texture', () => ({
  loadFloorTexture: mockLoadFloorTexture,
}))

beforeEach(() => {
  mockLoadFloorTexture.mockClear()
})

afterEach(() => {
  vi.useRealTimers()
})

function createOption(id: string): FloorFinishOption {
  return {
    id,
    label: id,
    diffusePath: `/textures/${id}-diffuse.ktx2`,
    normalPath: `/textures/${id}-normal.ktx2`,
    tileSizeMeters: { width: 0.5, depth: 0.5 },
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void

  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

describe('FloorMaterial', () => {
  it('keeps previous textures visible while loading new option to avoid flashing', async () => {
    const optionA = createOption('wood-floor')
    const optionB = createOption('concrete-floor')

    const textureA = {
      diffuse: new Texture(),
      normal: new Texture(),
    }

    const textureB = {
      diffuse: new Texture(),
      normal: new Texture(),
    }

    const optionBLoad = deferred<{ diffuse: Texture; normal: Texture }>()

    mockLoadFloorTexture.mockImplementation(
      async (option: FloorFinishOption) => {
        if (option.id === 'wood-floor') {
          return textureA
        }
        if (option.id === 'concrete-floor') {
          return optionBLoad.promise
        }
        throw new Error(`Unexpected option: ${option.id}`)
      },
    )

    const renderer = await createR3FTestScene(
      <mesh>
        <planeGeometry args={[2, 2]} />
        <FloorMaterial
          option={optionA}
          roomSizeMeters={{ width: 6, depth: 6 }}
        />
      </mesh>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    const initialMaterial = renderer.scene.findAll(
      (node) => node.type === 'MeshStandardMaterial',
    )[0].instance as unknown as MeshStandardMaterial
    expect(initialMaterial.map).toBe(textureA.diffuse)
    expect(initialMaterial.normalMap).toBe(textureA.normal)

    // Switch to new option while its textures are still loading
    await act(async () => {
      await renderer.update(
        <mesh>
          <planeGeometry args={[2, 2]} />
          <FloorMaterial
            option={optionB}
            roomSizeMeters={{ width: 6, depth: 6 }}
          />
        </mesh>,
      )
    })

    // Material should still show texture A while B is loading (visual continuity)
    const transitioningMaterial = renderer.scene.findAll(
      (node) => node.type === 'MeshStandardMaterial',
    )[0].instance as unknown as MeshStandardMaterial
    expect(transitioningMaterial.map).toBe(textureA.diffuse)
    expect(transitioningMaterial.normalMap).toBe(textureA.normal)

    // Resolve the pending load and verify material updates to new texture
    await act(async () => {
      optionBLoad.resolve(textureB)
      await optionBLoad.promise
    })

    const updatedMaterial = renderer.scene.findAll(
      (node) => node.type === 'MeshStandardMaterial',
    )[0].instance as unknown as MeshStandardMaterial
    expect(updatedMaterial).not.toBe(initialMaterial)
    expect(updatedMaterial.map).toBe(textureB.diffuse)
    expect(updatedMaterial.normalMap).toBe(textureB.normal)
  })

  it('reports loading state only on first load of an option (not on cached replays)', async () => {
    const option = createOption('wood-floor')
    const loadingSpy = vi.fn()
    const pendingLoad = deferred<{ diffuse: Texture; normal: Texture }>()

    mockLoadFloorTexture.mockReturnValueOnce(pendingLoad.promise)

    await createR3FTestScene(
      <mesh>
        <planeGeometry args={[2, 2]} />
        <FloorMaterial
          option={option}
          roomSizeMeters={{ width: 6, depth: 6 }}
          onLoadingChange={loadingSpy}
        />
      </mesh>,
    )

    expect(loadingSpy).toHaveBeenCalledWith(true)

    await act(async () => {
      pendingLoad.resolve({ diffuse: new Texture(), normal: new Texture() })
      await pendingLoad.promise
    })

    expect(loadingSpy).toHaveBeenCalledWith(false)
  })

  it('retries the same option after a transient load failure', async () => {
    vi.useFakeTimers()

    const option = createOption('wood-floor')
    const loadedTextures = {
      diffuse: new Texture(),
      normal: new Texture(),
    }

    mockLoadFloorTexture
      .mockRejectedValueOnce(new Error('transient failure'))
      .mockResolvedValueOnce(loadedTextures)

    const renderer = await createR3FTestScene(
      <mesh>
        <planeGeometry args={[2, 2]} />
        <FloorMaterial
          option={option}
          roomSizeMeters={{ width: 6, depth: 6 }}
        />
      </mesh>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockLoadFloorTexture).toHaveBeenCalledTimes(1)

    await act(async () => {
      vi.advanceTimersByTime(500)
      await Promise.resolve()
    })

    await act(async () => {
      await Promise.resolve()
    })

    expect(mockLoadFloorTexture).toHaveBeenCalledTimes(2)

    const material = renderer.scene.findAll(
      (node) => node.type === 'MeshStandardMaterial',
    )[0].instance as unknown as MeshStandardMaterial
    expect(material.map).toBe(loadedTextures.diffuse)
    expect(material.normalMap).toBe(loadedTextures.normal)
  })

  it('applies repeat from displayed option, not pending option, during transitions', async () => {
    const optionA = createOption('wood-floor')
    optionA.tileSizeMeters = { width: 1, depth: 1 } // 6m room / 1m tile = 6x repeat

    const optionB = createOption('concrete-floor')
    optionB.tileSizeMeters = { width: 2, depth: 2 } // 6m room / 2m tile = 3x repeat

    const textureA = {
      diffuse: new Texture(),
      normal: new Texture(),
    }

    const textureB = {
      diffuse: new Texture(),
      normal: new Texture(),
    }

    const optionBLoad = deferred<{ diffuse: Texture; normal: Texture }>()

    mockLoadFloorTexture.mockImplementation(
      async (option: FloorFinishOption) => {
        if (option.id === 'wood-floor') {
          return textureA
        }
        if (option.id === 'concrete-floor') {
          return optionBLoad.promise
        }
        throw new Error(`Unexpected option: ${option.id}`)
      },
    )

    const renderer = await createR3FTestScene(
      <mesh>
        <planeGeometry args={[2, 2]} />
        <FloorMaterial
          option={optionA}
          roomSizeMeters={{ width: 6, depth: 6 }}
        />
      </mesh>,
    )

    await act(async () => {
      await Promise.resolve()
    })

    const initialMaterial = renderer.scene.findAll(
      (node) => node.type === 'MeshStandardMaterial',
    )[0].instance as unknown as MeshStandardMaterial
    expect(initialMaterial.map?.repeat.x).toBe(6) // optionA: 6/1 = 6

    // Switch to optionB while its textures are still loading
    await act(async () => {
      await renderer.update(
        <mesh>
          <planeGeometry args={[2, 2]} />
          <FloorMaterial
            option={optionB}
            roomSizeMeters={{ width: 6, depth: 6 }}
          />
        </mesh>,
      )
    })

    // During transition, material displays old textures but should keep their repeat values
    // (not adopt the pending option's repeat). This prevents visible texture retiling.
    const transitioningMaterial = renderer.scene.findAll(
      (node) => node.type === 'MeshStandardMaterial',
    )[0].instance as unknown as MeshStandardMaterial
    expect(transitioningMaterial.map).toBe(textureA.diffuse)
    expect(transitioningMaterial.map?.repeat.x).toBe(6)

    // Once new textures load, repeat updates to match the new option
    await act(async () => {
      optionBLoad.resolve(textureB)
      await optionBLoad.promise
    })

    const updatedMaterial = renderer.scene.findAll(
      (node) => node.type === 'MeshStandardMaterial',
    )[0].instance as unknown as MeshStandardMaterial
    expect(updatedMaterial.map).toBe(textureB.diffuse)
    expect(updatedMaterial.map?.repeat.x).toBe(3)
  })
})
