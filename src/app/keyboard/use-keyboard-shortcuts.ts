import { useEffect, useEffectEvent } from 'react'
import type { CameraPreset } from '@/scene/scene.types'
import {
  isContentEditableTarget,
  isDialogTarget,
  isTextInputLikeTagName,
} from '@/lib/ui/keyboard-event-target'
import {
  matchesKeyCombo,
  type KeyCombo,
} from '@/lib/ui/keyboard-shortcut-matcher'

export type RotationDirection = -1 | 1
export type SuppressionMode = 'always-on-match' | 'on-execute'

interface ShortcutContext {
  targetIsEditingTarget: boolean
  targetIsInDialog: boolean
  isBlockingOverlayOpen: boolean
  hasSelection: boolean
  canStartOver: boolean
  roomViewHasFocus: boolean
}

interface ShortcutDefinition {
  id: string
  match: KeyCombo | KeyCombo[]
  allowMatchInEditingTarget?: boolean
  requiresRoomViewFocus?: boolean
  requiresSelection?: boolean
  canExecute?: (context: ShortcutContext) => boolean
  suppressionMode?: SuppressionMode
  execute: () => void
}

interface UseKeyboardShortcutsOptions {
  enabled: boolean
  hasSelection: boolean
  isBlockingOverlayOpen: boolean
  canStartOver: boolean
  roomViewHasFocus: boolean
  onUndo: () => void
  onRedo: () => void
  onStartOverIntent: () => void
  onOpenDeleteDialog: () => void
  onFocusSelected: () => void
  onMoveSelection: (delta: { x: number; z: number }) => void
  onClearSelection: () => void
  onRotate: (direction: RotationDirection) => void
  onSetCameraPreset: (preset: CameraPreset) => void
  onCanvasBrowse: (direction: 'next' | 'prev' | 'first' | 'last') => void
  onCanvasSelectPreviewed: () => void
}

function shouldBlockForTextInput(
  targetTagName?: string,
  targetIsContentEditable?: boolean,
): boolean {
  return (
    targetIsContentEditable === true || isTextInputLikeTagName(targetTagName)
  )
}

function canMatchShortcut(
  shortcut: ShortcutDefinition,
  context: ShortcutContext,
): boolean {
  // Don't match in text inputs unless the shortcut explicitly needs browser suppression.
  if (context.targetIsEditingTarget && !shortcut.allowMatchInEditingTarget) {
    return false
  }

  // Room-view-scoped shortcuts only fire when the room view has keyboard focus.
  if (shortcut.requiresRoomViewFocus && !context.roomViewHasFocus) {
    return false
  }

  // Escape is special: let dialogs handle it natively for close behavior
  const isEscapeInDialog =
    context.targetIsInDialog && shortcut.id === 'clear-selection'
  if (isEscapeInDialog) {
    return false
  }

  return true
}

function canExecuteShortcut(
  shortcut: ShortcutDefinition,
  context: ShortcutContext,
): boolean {
  if (context.isBlockingOverlayOpen) {
    return false
  }

  if (shortcut.requiresSelection && !context.hasSelection) {
    return false
  }

  if (shortcut.canExecute && !shortcut.canExecute(context)) {
    return false
  }

  return true
}

export function useKeyboardShortcuts({
  enabled,
  hasSelection,
  isBlockingOverlayOpen,
  canStartOver,
  roomViewHasFocus,
  onUndo,
  onRedo,
  onStartOverIntent,
  onOpenDeleteDialog,
  onFocusSelected,
  onMoveSelection,
  onClearSelection,
  onRotate,
  onSetCameraPreset,
  onCanvasBrowse,
  onCanvasSelectPreviewed,
}: UseKeyboardShortcutsOptions): void {
  const shortcutDefinitions: ShortcutDefinition[] = [
    {
      id: 'undo',
      match: { key: 'z', ctrlOrMeta: true },
      suppressionMode: 'always-on-match',
      execute: onUndo,
    },
    {
      id: 'redo',
      match: [
        { key: 'z', ctrlOrMeta: true, shift: true },
        { key: 'y', ctrlOrMeta: true },
      ],
      suppressionMode: 'always-on-match',
      execute: onRedo,
    },
    {
      id: 'start-over',
      match: { key: 'n', ctrlOrMeta: true, alt: true },
      canExecute: (context) => context.canStartOver,
      execute: onStartOverIntent,
    },
    {
      id: 'delete',
      match: [{ key: 'delete' }, { key: 'backspace' }],
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: onOpenDeleteDialog,
    },
    {
      id: 'focus-selected',
      match: { key: 'f' },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: onFocusSelected,
    },
    {
      id: 'preset-corner',
      match: [
        { key: '1' },
        // Some common layouts (for example AZERTY) require Shift for number-row digits.
        { code: 'Digit1', shift: true },
        { code: 'Numpad1' },
      ],
      requiresRoomViewFocus: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onSetCameraPreset('corner')
      },
    },
    {
      id: 'preset-front',
      match: [
        { key: '2' },
        { code: 'Digit2', shift: true },
        { code: 'Numpad2' },
      ],
      requiresRoomViewFocus: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onSetCameraPreset('front')
      },
    },
    {
      id: 'preset-side',
      match: [
        { key: '3' },
        { code: 'Digit3', shift: true },
        { code: 'Numpad3' },
      ],
      requiresRoomViewFocus: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onSetCameraPreset('side')
      },
    },
    {
      id: 'preset-top',
      match: [
        { key: '4' },
        { code: 'Digit4', shift: true },
        { code: 'Numpad4' },
      ],
      requiresRoomViewFocus: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onSetCameraPreset('top')
      },
    },
    {
      id: 'move-up',
      match: { key: 'ArrowUp' },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: -0.5 })
      },
    },
    {
      id: 'move-up-large',
      match: { key: 'ArrowUp', shift: true },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: -1 })
      },
    },
    {
      id: 'move-up-small',
      match: { key: 'ArrowUp', alt: true },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: -0.1 })
      },
    },
    {
      id: 'move-down',
      match: { key: 'ArrowDown' },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: 0.5 })
      },
    },
    {
      id: 'move-down-large',
      match: { key: 'ArrowDown', shift: true },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: 1 })
      },
    },
    {
      id: 'move-down-small',
      match: { key: 'ArrowDown', alt: true },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: 0.1 })
      },
    },
    {
      id: 'move-left',
      match: { key: 'ArrowLeft' },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: -0.5, z: 0 })
      },
    },
    {
      id: 'move-left-large',
      match: { key: 'ArrowLeft', shift: true },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: -1, z: 0 })
      },
    },
    {
      id: 'move-left-small',
      match: { key: 'ArrowLeft', alt: true },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: -0.1, z: 0 })
      },
    },
    {
      id: 'move-right',
      match: { key: 'ArrowRight' },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0.5, z: 0 })
      },
    },
    {
      id: 'move-right-large',
      match: { key: 'ArrowRight', shift: true },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 1, z: 0 })
      },
    },
    {
      id: 'move-right-small',
      match: { key: 'ArrowRight', alt: true },
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0.1, z: 0 })
      },
    },
    {
      id: 'rotate-left',
      match: [{ key: ',' }, { code: 'Comma' }],
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onRotate(1)
      },
    },
    {
      id: 'rotate-right',
      match: [{ key: '.' }, { code: 'Period' }],
      requiresRoomViewFocus: true,
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onRotate(-1)
      },
    },
    {
      id: 'canvas-browse-next',
      match: [{ key: 'ArrowRight' }, { key: 'ArrowDown' }],
      requiresRoomViewFocus: true,
      canExecute: (context) => !context.hasSelection,
      suppressionMode: 'on-execute',
      execute: () => {
        onCanvasBrowse('next')
      },
    },
    {
      id: 'canvas-browse-prev',
      match: [{ key: 'ArrowLeft' }, { key: 'ArrowUp' }],
      requiresRoomViewFocus: true,
      canExecute: (context) => !context.hasSelection,
      suppressionMode: 'on-execute',
      execute: () => {
        onCanvasBrowse('prev')
      },
    },
    {
      id: 'canvas-browse-first',
      match: { key: 'Home' },
      requiresRoomViewFocus: true,
      canExecute: (context) => !context.hasSelection,
      suppressionMode: 'on-execute',
      execute: () => {
        onCanvasBrowse('first')
      },
    },
    {
      id: 'canvas-browse-last',
      match: { key: 'End' },
      requiresRoomViewFocus: true,
      canExecute: (context) => !context.hasSelection,
      suppressionMode: 'on-execute',
      execute: () => {
        onCanvasBrowse('last')
      },
    },
    {
      id: 'canvas-select-previewed',
      match: [{ key: 'Enter' }, { key: ' ' }],
      requiresRoomViewFocus: true,
      canExecute: (context) => !context.hasSelection,
      suppressionMode: 'on-execute',
      execute: onCanvasSelectPreviewed,
    },
    {
      id: 'clear-selection',
      match: { key: 'Escape' },
      requiresRoomViewFocus: true,
      suppressionMode: 'on-execute',
      execute: onClearSelection,
    },
  ]

  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) {
      return
    }

    if (event.defaultPrevented) {
      return
    }

    const target = event.target instanceof HTMLElement ? event.target : null
    const targetTagName = target?.tagName
    const targetIsContentEditable = target
      ? isContentEditableTarget(target)
      : false

    const context: ShortcutContext = {
      targetIsEditingTarget: shouldBlockForTextInput(
        targetTagName,
        targetIsContentEditable,
      ),
      targetIsInDialog: isDialogTarget(target),
      isBlockingOverlayOpen,
      hasSelection,
      canStartOver,
      roomViewHasFocus,
    }

    for (const shortcut of shortcutDefinitions) {
      if (!canMatchShortcut(shortcut, context)) {
        continue
      }

      if (!matchesKeyCombo(event, shortcut.match)) {
        continue
      }

      const suppressionMode = shortcut.suppressionMode ?? 'on-execute'
      const canExecute = canExecuteShortcut(shortcut, context)

      // always-on-match: suppress and stop on first match regardless of execute
      if (suppressionMode === 'always-on-match') {
        event.preventDefault()
        if (canExecute) {
          shortcut.execute()
        }
        return
      }

      // on-execute: suppress and stop only if the action will actually run
      if (canExecute) {
        event.preventDefault()
        shortcut.execute()
        return
      }

      // on-execute + can't execute: fall through to the next matching shortcut
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
