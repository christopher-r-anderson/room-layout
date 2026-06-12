// @vitest-environment jsdom

import { fireEvent, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useCameraKeyState } from './use-camera-key-state'
import { sceneCommands } from '@/scene/scene-commands'

function createSetCameraKeyStateSpy() {
  return vi
    .spyOn(sceneCommands, 'setCameraKeyState')
    .mockImplementation(() => undefined)
}

describe('useCameraKeyState', () => {
  afterEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('tracks pressed and released camera keys against the live scene actions', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        roomViewHasFocus: true,
      })
    })

    fireEvent.keyDown(window, { code: 'KeyW', key: 'w' })
    fireEvent.keyUp(window, { code: 'KeyW', key: 'w' })

    expect(setCameraKeyState.mock.calls).toHaveLength(2)
    const firstCall = setCameraKeyState.mock.calls[0][0]
    const secondCall = setCameraKeyState.mock.calls[1][0]

    expect(firstCall.has('keyW')).toBe(true)
    expect(firstCall.size).toBe(1)
    expect(secondCall.size).toBe(0)
  })

  it('normalizes zoom keys from event.key values', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        roomViewHasFocus: true,
      })
    })

    fireEvent.keyDown(window, { code: 'Unidentified', key: '=' })
    fireEvent.keyUp(window, { code: 'Unidentified', key: '=' })

    expect(setCameraKeyState.mock.calls).toHaveLength(2)
    const firstCall = setCameraKeyState.mock.calls[0][0]
    const secondCall = setCameraKeyState.mock.calls[1][0]

    expect(firstCall.has('equal')).toBe(true)
    expect(firstCall.size).toBe(1)
    expect(secondCall.size).toBe(0)
  })

  it('tracks Shift+Minus as zoom-out without introducing extra camera keys', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        roomViewHasFocus: true,
      })
    })

    fireEvent.keyDown(window, { code: 'ShiftLeft', key: 'Shift' })
    fireEvent.keyDown(window, { code: 'Minus', key: '_' })

    expect(setCameraKeyState).toHaveBeenCalledTimes(2)
    const shiftState = setCameraKeyState.mock.calls[0][0]
    const zoomState = setCameraKeyState.mock.calls[1][0]

    expect(shiftState.has('shift')).toBe(true)
    expect(shiftState.size).toBe(1)
    expect(zoomState.has('shift')).toBe(true)
    expect(zoomState.has('minus')).toBe(true)
    expect(zoomState.size).toBe(2)
  })

  it('keeps shift pressed until both physical shift keys are released', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        roomViewHasFocus: true,
      })
    })

    fireEvent.keyDown(window, { code: 'ShiftLeft', key: 'Shift' })
    fireEvent.keyDown(window, { code: 'ShiftRight', key: 'Shift' })
    fireEvent.keyUp(window, { code: 'ShiftLeft', key: 'Shift' })
    fireEvent.keyUp(window, { code: 'ShiftRight', key: 'Shift' })

    expect(setCameraKeyState.mock.calls).toHaveLength(2)
    const firstCall = setCameraKeyState.mock.calls[0][0]
    const secondCall = setCameraKeyState.mock.calls[1][0]

    expect(firstCall.has('shift')).toBe(true)
    expect(secondCall.has('shift')).toBe(false)
  })

  it('ignores browser zoom modifier chords for held camera zoom keys', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        roomViewHasFocus: true,
      })
    })

    fireEvent.keyDown(window, { code: 'Equal', key: '+', ctrlKey: true })
    fireEvent.keyDown(window, { code: 'Minus', key: '-', metaKey: true })

    expect(setCameraKeyState).not.toHaveBeenCalled()
  })

  it('does not start WASD movement from physical key codes on non-QWERTY layouts', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        roomViewHasFocus: true,
      })
    })

    fireEvent.keyDown(window, { code: 'KeyW', key: 'z' })
    fireEvent.keyUp(window, { code: 'KeyW', key: 'z' })

    expect(setCameraKeyState).not.toHaveBeenCalled()
  })

  it('suppresses camera motion while focus is inside a modal dialog', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()
    const dialog = document.createElement('div')
    dialog.setAttribute('role', 'dialog')
    const button = document.createElement('button')
    dialog.appendChild(button)
    document.body.appendChild(dialog)

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        roomViewHasFocus: true,
      })
    })

    fireEvent.keyDown(button, { code: 'KeyW', key: 'w' })
    fireEvent.keyUp(button, { code: 'KeyW', key: 'w' })

    expect(setCameraKeyState).not.toHaveBeenCalled()
  })

  it('suppresses camera motion while focus is inside an alert dialog', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()
    const alertDialog = document.createElement('div')
    alertDialog.setAttribute('role', 'alertdialog')
    const button = document.createElement('button')
    alertDialog.appendChild(button)
    document.body.appendChild(alertDialog)

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        roomViewHasFocus: true,
      })
    })

    fireEvent.keyDown(button, { code: 'KeyW', key: 'w' })
    fireEvent.keyUp(button, { code: 'KeyW', key: 'w' })

    expect(setCameraKeyState).not.toHaveBeenCalled()
  })

  it('suppresses camera motion whenever a blocking overlay is open', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        isBlockingOverlayOpen: true,
        roomViewHasFocus: true,
      })
    })

    fireEvent.keyDown(window, { code: 'KeyW', key: 'w' })
    fireEvent.keyUp(window, { code: 'KeyW', key: 'w' })

    expect(setCameraKeyState).not.toHaveBeenCalled()
  })

  it('clears held camera keys when a blocking overlay opens', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    const { rerender } = renderHook(
      ({
        enabled,
        isBlockingOverlayOpen,
      }: {
        enabled: boolean
        isBlockingOverlayOpen: boolean
      }) => {
        useCameraKeyState({
          enabled,
          isBlockingOverlayOpen,
          roomViewHasFocus: true,
        })
      },
      {
        initialProps: {
          enabled: true,
          isBlockingOverlayOpen: false,
        },
      },
    )

    fireEvent.keyDown(window, { code: 'KeyW', key: 'w' })
    rerender({
      enabled: true,
      isBlockingOverlayOpen: true,
    })

    expect(setCameraKeyState.mock.calls).toHaveLength(2)
    expect(setCameraKeyState.mock.calls[0][0].has('keyW')).toBe(true)
    expect(setCameraKeyState.mock.calls[1][0].size).toBe(0)
  })

  it('suppresses camera motion when room view is not focused', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    renderHook(() => {
      useCameraKeyState({
        enabled: true,
        roomViewHasFocus: false,
      })
    })

    fireEvent.keyDown(window, { code: 'KeyW', key: 'w' })
    fireEvent.keyUp(window, { code: 'KeyW', key: 'w' })

    expect(setCameraKeyState).not.toHaveBeenCalled()
  })

  it('clears held camera keys when room-view focus is lost', () => {
    const setCameraKeyState = createSetCameraKeyStateSpy()

    const { rerender } = renderHook(
      ({ roomViewHasFocus }: { roomViewHasFocus: boolean }) => {
        useCameraKeyState({
          enabled: true,
          roomViewHasFocus,
        })
      },
      { initialProps: { roomViewHasFocus: true } },
    )

    fireEvent.keyDown(window, { code: 'KeyW', key: 'w' })
    rerender({ roomViewHasFocus: false })

    expect(setCameraKeyState.mock.calls).toHaveLength(2)
    expect(setCameraKeyState.mock.calls[0][0].has('keyW')).toBe(true)
    expect(setCameraKeyState.mock.calls[1][0].size).toBe(0)
  })
})
