// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { CameraControlsImpl } from '@react-three/drei'
import { useCameraKeyMotion } from './use-camera-key-motion'
import type { CameraKeyName } from '../scene.types'

const { mockUseFrame } = vi.hoisted(() => ({ mockUseFrame: vi.fn() }))

vi.mock('@react-three/fiber', () => ({
  useFrame: mockUseFrame,
}))

describe('useCameraKeyMotion', () => {
  beforeEach(() => {
    mockUseFrame.mockReset()
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

    // Orbit (rotate) with W
    act(() => {
      cameraKeyStateRef.current = new Set<CameraKeyName>(['keyW'])
      frameCallback?.(frameState, 0.025)
    })
    expect(rotate).toHaveBeenCalledWith(0, -1.5 * 0.025, false)

    // Pan (truck) with Shift+W
    act(() => {
      cameraKeyStateRef.current = new Set<CameraKeyName>(['keyW', 'shift'])
      frameCallback?.(frameState, 0.025)
    })
    expect(truck).toHaveBeenCalledWith(0, -3 * 0.025, false)

    // Zoom in with =
    act(() => {
      cameraKeyStateRef.current = new Set<CameraKeyName>(['equal'])
      frameCallback?.(frameState, 0.025)
    })
    expect(dolly).toHaveBeenCalledWith(3 * 0.025, false)

    // Zoom out with -
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
