// @vitest-environment jsdom

import { fireEvent, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCameraKeyState } from './use-camera-key-state'
import type { CameraKeyState } from '@/scene/scene.types'

function createSceneRef() {
  const setCameraKeyState = vi.fn<(keyState: CameraKeyState) => void>()
  return {
    current: {
      setCameraKeyState,
    },
    setCameraKeyState,
  }
}

describe('useCameraKeyState', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('tracks pressed and released camera keys against the live scene ref', () => {
    const sceneRef = createSceneRef()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        sceneRef,
      })
    })

    fireEvent.keyDown(window, { code: 'KeyW', key: 'w' })
    fireEvent.keyUp(window, { code: 'KeyW', key: 'w' })

    expect(sceneRef.setCameraKeyState.mock.calls).toHaveLength(2)
    const firstCall = sceneRef.setCameraKeyState.mock.calls[0][0]
    const secondCall = sceneRef.setCameraKeyState.mock.calls[1][0]

    expect(firstCall.has('keyW')).toBe(true)
    expect(firstCall.size).toBe(1)
    expect(secondCall.size).toBe(0)
  })

  it('normalizes zoom keys from event.key values', () => {
    const sceneRef = createSceneRef()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        sceneRef,
      })
    })

    fireEvent.keyDown(window, { code: 'Unidentified', key: '=' })
    fireEvent.keyUp(window, { code: 'Unidentified', key: '=' })

    expect(sceneRef.setCameraKeyState.mock.calls).toHaveLength(2)
    const firstCall = sceneRef.setCameraKeyState.mock.calls[0][0]
    const secondCall = sceneRef.setCameraKeyState.mock.calls[1][0]

    expect(firstCall.has('equal')).toBe(true)
    expect(firstCall.size).toBe(1)
    expect(secondCall.size).toBe(0)
  })

  it('keeps shift pressed until both physical shift keys are released', () => {
    const sceneRef = createSceneRef()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        sceneRef,
      })
    })

    fireEvent.keyDown(window, { code: 'ShiftLeft', key: 'Shift' })
    fireEvent.keyDown(window, { code: 'ShiftRight', key: 'Shift' })
    fireEvent.keyUp(window, { code: 'ShiftLeft', key: 'Shift' })
    fireEvent.keyUp(window, { code: 'ShiftRight', key: 'Shift' })

    expect(sceneRef.setCameraKeyState.mock.calls).toHaveLength(2)
    const firstCall = sceneRef.setCameraKeyState.mock.calls[0][0]
    const secondCall = sceneRef.setCameraKeyState.mock.calls[1][0]

    expect(firstCall.has('shift')).toBe(true)
    expect(secondCall.has('shift')).toBe(false)
  })

  it('ignores browser zoom modifier chords for held camera zoom keys', () => {
    const sceneRef = createSceneRef()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        sceneRef,
      })
    })

    fireEvent.keyDown(window, { code: 'Equal', key: '+', ctrlKey: true })
    fireEvent.keyDown(window, { code: 'Minus', key: '-', metaKey: true })

    expect(sceneRef.setCameraKeyState).not.toHaveBeenCalled()
  })

  it('does not start WASD movement from physical key codes on non-QWERTY layouts', () => {
    const sceneRef = createSceneRef()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        sceneRef,
      })
    })

    fireEvent.keyDown(window, { code: 'KeyW', key: 'z' })
    fireEvent.keyUp(window, { code: 'KeyW', key: 'z' })

    expect(sceneRef.setCameraKeyState).not.toHaveBeenCalled()
  })

  it('suppresses camera motion while focus is inside a modal dialog', () => {
    const sceneRef = createSceneRef()
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const button = document.createElement('button')
    dialog.appendChild(button)
    document.body.appendChild(dialog)

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        sceneRef,
      })
    })

    fireEvent.keyDown(button, { code: 'KeyW', key: 'w' })
    fireEvent.keyUp(button, { code: 'KeyW', key: 'w' })

    expect(sceneRef.current.setCameraKeyState).not.toHaveBeenCalled()
  })

  it('suppresses camera motion while focus is inside an alert dialog', () => {
    const sceneRef = createSceneRef()
    const alertDialog = document.createElement('div')
    alertDialog.setAttribute('role', 'alertdialog')
    const button = document.createElement('button')
    alertDialog.appendChild(button)
    document.body.appendChild(alertDialog)

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        sceneRef,
      })
    })

    fireEvent.keyDown(button, { code: 'KeyW', key: 'w' })
    fireEvent.keyUp(button, { code: 'KeyW', key: 'w' })

    expect(sceneRef.current.setCameraKeyState).not.toHaveBeenCalled()
  })
})
