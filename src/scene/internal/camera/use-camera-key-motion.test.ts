// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CameraControlsImpl } from '@react-three/drei'
import { useCameraKeyMotion } from './use-camera-key-motion'
import type { CameraKeyName } from '@/core/scene.types'

const { mockUseFrame } = vi.hoisted(() => ({ mockUseFrame: vi.fn() }))

vi.mock('@react-three/fiber', () => ({
  useFrame: mockUseFrame,
}))

function setupKeyMotion() {
  let frameCallback: ((state: unknown, delta: number) => void) | undefined
  mockUseFrame.mockImplementation((callback) => {
    frameCallback = callback as (state: unknown, delta: number) => void
  })

  const rotate = vi
    .fn<CameraControlsImpl['rotate']>()
    .mockResolvedValue(undefined)
  const truck = vi
    .fn<CameraControlsImpl['truck']>()
    .mockResolvedValue(undefined)
  const dolly = vi
    .fn<CameraControlsImpl['dolly']>()
    .mockResolvedValue(undefined)
  const controls = { rotate, truck, dolly } as unknown as CameraControlsImpl
  const cameraKeyStateRef = { current: new Set<CameraKeyName>() }

  renderHook(() => {
    useCameraKeyMotion({
      cameraControlsRef: { current: controls },
      cameraKeyStateRef,
    })
  })

  const frameState = { invalidate: vi.fn() }
  const runFrame = (keys: CameraKeyName[], delta = 0.025) => {
    act(() => {
      cameraKeyStateRef.current = new Set<CameraKeyName>(keys)
      frameCallback?.(frameState, delta)
    })
  }

  return { rotate, truck, dolly, runFrame }
}

describe('useCameraKeyMotion', () => {
  beforeEach(() => {
    mockUseFrame.mockReset()
  })

  it('orbits in all four directions with WASD', () => {
    const { rotate, runFrame } = setupKeyMotion()

    runFrame(['keyW'])
    expect(rotate).toHaveBeenLastCalledWith(0, -1.5 * 0.025, false)
    runFrame(['keyS'])
    expect(rotate).toHaveBeenLastCalledWith(0, 1.5 * 0.025, false)
    runFrame(['keyA'])
    expect(rotate).toHaveBeenLastCalledWith(-1.5 * 0.025, 0, false)
    runFrame(['keyD'])
    expect(rotate).toHaveBeenLastCalledWith(1.5 * 0.025, 0, false)
  })

  it('pans in all four directions with Shift+WASD', () => {
    const { truck, runFrame } = setupKeyMotion()

    runFrame(['keyW', 'shift'])
    expect(truck).toHaveBeenLastCalledWith(0, -3 * 0.025, false)
    runFrame(['keyS', 'shift'])
    expect(truck).toHaveBeenLastCalledWith(0, 3 * 0.025, false)
    runFrame(['keyA', 'shift'])
    expect(truck).toHaveBeenLastCalledWith(-3 * 0.025, 0, false)
    runFrame(['keyD', 'shift'])
    expect(truck).toHaveBeenLastCalledWith(3 * 0.025, 0, false)
  })

  it('caps the per-frame delta to avoid large jumps after a stall', () => {
    const { rotate, runFrame } = setupKeyMotion()

    // A 1s frame gap is clamped to the 0.05 cap before scaling the motion.
    runFrame(['keyW'], 1)

    expect(rotate).toHaveBeenLastCalledWith(0, -1.5 * 0.05, false)
  })

  it('applies continuous camera motion using the render-loop delta', () => {
    let frameCallback: ((state: unknown, delta: number) => void) | undefined
    mockUseFrame.mockImplementation((callback) => {
      frameCallback = callback as (state: unknown, delta: number) => void
    })

    const truck = vi
      .fn<CameraControlsImpl['truck']>()
      .mockResolvedValue(undefined)
    const rotate = vi
      .fn<CameraControlsImpl['rotate']>()
      .mockResolvedValue(undefined)
    const dolly = vi
      .fn<CameraControlsImpl['dolly']>()
      .mockResolvedValue(undefined)
    const controls = {
      truck,
      rotate,
      dolly,
    } as unknown as CameraControlsImpl
    const cameraKeyStateRef = { current: new Set<CameraKeyName>() }

    renderHook(() => {
      useCameraKeyMotion({
        cameraControlsRef: { current: controls },
        cameraKeyStateRef,
      })
    })

    const frameState = { invalidate: vi.fn() }

    act(() => {
      cameraKeyStateRef.current = new Set<CameraKeyName>(['keyW'])
      frameCallback?.(frameState, 0.025)
    })
    expect(rotate).toHaveBeenCalledWith(0, -1.5 * 0.025, false)

    act(() => {
      cameraKeyStateRef.current = new Set<CameraKeyName>(['keyW', 'shift'])
      frameCallback?.(frameState, 0.025)
    })
    expect(truck).toHaveBeenCalledWith(0, -3 * 0.025, false)

    act(() => {
      cameraKeyStateRef.current = new Set<CameraKeyName>(['equal'])
      frameCallback?.(frameState, 0.025)
    })
    expect(dolly).toHaveBeenCalledWith(3 * 0.025, false)

    act(() => {
      cameraKeyStateRef.current = new Set<CameraKeyName>(['minus'])
      frameCallback?.(frameState, 0.025)
    })
    expect(dolly).toHaveBeenCalledWith(-3 * 0.025, false)

    // Shift+Minus still zooms and does not introduce pan/orbit side effects.
    act(() => {
      cameraKeyStateRef.current = new Set<CameraKeyName>(['shift', 'minus'])
      frameCallback?.(frameState, 0.025)
    })
    expect(dolly).toHaveBeenCalledWith(-3 * 0.025, false)
    expect(truck).toHaveBeenCalledTimes(1)
    expect(rotate).toHaveBeenCalledTimes(1)
    expect(frameState.invalidate).toHaveBeenCalledTimes(5)
  })
})
