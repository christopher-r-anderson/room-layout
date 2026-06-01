import { useEffect, useRef } from 'react'
import { isDialogTarget, isEditingTarget } from '@/lib/ui/keyboard-event-target'
import { sceneCommands } from '@/scene/scene-commands'
import type { CameraKeyName, CameraKeyState } from '@/scene/scene.types'

interface UseCameraKeyStateOptions {
  enabled: boolean
  isBlockingOverlayOpen?: boolean
  roomViewHasFocus: boolean
}

const CAMERA_KEY_IDS: Record<string, CameraKeyName> = {
  ShiftLeft: 'shift',
  ShiftRight: 'shift',
  ArrowUp: 'arrowUp',
  ArrowDown: 'arrowDown',
  ArrowLeft: 'arrowLeft',
  ArrowRight: 'arrowRight',
  KeyW: 'keyW',
  w: 'keyW',
  KeyA: 'keyA',
  a: 'keyA',
  KeyS: 'keyS',
  s: 'keyS',
  KeyD: 'keyD',
  d: 'keyD',
  Equal: 'equal',
  '=': 'equal',
  '+': 'equal',
  NumpadAdd: 'equal',
  Minus: 'minus',
  '-': 'minus',
  _: 'minus',
  NumpadSubtract: 'minus',
}

const LETTER_CAMERA_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD'])
const SHIFT_CAMERA_CODES = new Set(['ShiftLeft', 'ShiftRight'])

const normalizeCameraKey = (key: string): string =>
  key.length === 1 ? key.toLowerCase() : key

const isZoomModifierChord = (event: KeyboardEvent): boolean => {
  if (!event.ctrlKey && !event.metaKey) {
    return false
  }

  const normalizedKey = normalizeCameraKey(event.key)
  const keyMatch = CAMERA_KEY_IDS[normalizedKey]
  const codeMatch = LETTER_CAMERA_CODES.has(event.code)
    ? undefined
    : CAMERA_KEY_IDS[event.code]

  return (
    keyMatch === 'equal' ||
    keyMatch === 'minus' ||
    codeMatch === 'equal' ||
    codeMatch === 'minus'
  )
}

export function useCameraKeyState({
  enabled,
  isBlockingOverlayOpen = false,
  roomViewHasFocus,
}: UseCameraKeyStateOptions): void {
  const keyStateRef = useRef<CameraKeyState>(new Set())
  const pressedShiftCodesRef = useRef<Set<string>>(new Set())

  const updateCameraKeyState = (
    keyId: string,
    isPressed: boolean,
  ): CameraKeyState | null => {
    if (!(keyId in CAMERA_KEY_IDS)) {
      return null
    }

    const stateKey = CAMERA_KEY_IDS[keyId]
    const currentState = keyStateRef.current
    const oldValue = currentState.has(stateKey)
    const newValue = isPressed

    if (oldValue === newValue) {
      return null
    }

    const nextState = new Set(currentState)

    if (newValue) {
      nextState.add(stateKey)
    } else {
      nextState.delete(stateKey)
    }

    keyStateRef.current = nextState
    return nextState
  }

  useEffect(() => {
    const resetKeyState = () => {
      pressedShiftCodesRef.current = new Set()

      if (keyStateRef.current.size === 0) {
        return
      }

      keyStateRef.current = new Set()
      sceneCommands.setCameraKeyState(new Set())
    }

    if (!enabled || isBlockingOverlayOpen || !roomViewHasFocus) {
      resetKeyState()
      return
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (isEditingTarget(event.target) || isDialogTarget(event.target)) {
        return
      }

      if (isZoomModifierChord(event)) {
        return
      }

      if (SHIFT_CAMERA_CODES.has(event.code)) {
        pressedShiftCodesRef.current.add(event.code)
      }

      const nextState =
        updateCameraKeyState(normalizeCameraKey(event.key), true) ??
        (LETTER_CAMERA_CODES.has(event.code)
          ? null
          : updateCameraKeyState(event.code, true))
      if (nextState !== null) {
        sceneCommands.setCameraKeyState(nextState)
      }
    }

    const handleKeyUp = (event: KeyboardEvent) => {
      if (SHIFT_CAMERA_CODES.has(event.code)) {
        pressedShiftCodesRef.current.delete(event.code)
        const nextState = updateCameraKeyState(
          event.code,
          pressedShiftCodesRef.current.size > 0,
        )
        if (nextState !== null) {
          sceneCommands.setCameraKeyState(nextState)
        }
        return
      }

      const nextState =
        updateCameraKeyState(normalizeCameraKey(event.key), false) ??
        (LETTER_CAMERA_CODES.has(event.code)
          ? null
          : updateCameraKeyState(event.code, false))
      if (nextState !== null) {
        sceneCommands.setCameraKeyState(nextState)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)
    window.addEventListener('blur', resetKeyState)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
      window.removeEventListener('blur', resetKeyState)
      resetKeyState()
    }
  }, [enabled, isBlockingOverlayOpen, roomViewHasFocus])
}
