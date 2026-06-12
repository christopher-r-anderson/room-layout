import { useEffect, useEffectEvent } from 'react'
import type { CameraPreset } from '@/scene/scene.types'
import {
  isContentEditableTarget,
  isDialogTarget,
  isTextInputLikeTagName,
} from '@/shared/lib/ui/keyboard-event-target'
import {
  matchesKeyCombo,
  type KeyCombo,
} from '@/shared/lib/ui/keyboard-shortcut-matcher'
import {
  USE_KEYBOARD_SHORTCUT_DEFINITIONS,
  type KeyboardShortcutDefinition,
  type SuppressionMode,
} from './keyboard-shortcuts.definitions'

type RotationDirection = -1 | 1

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
  requiresNoSelection?: boolean
  requiresStartOverCapability?: boolean
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

  if (shortcut.requiresNoSelection && context.hasSelection) {
    return false
  }

  if (shortcut.requiresStartOverCapability && !context.canStartOver) {
    return false
  }

  return true
}

function getShortcutExecutor(
  shortcutId: KeyboardShortcutDefinition['id'],
  callbacks: {
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
  },
) {
  switch (shortcutId) {
    case 'undo':
      return callbacks.onUndo
    case 'redo':
      return callbacks.onRedo
    case 'start-over':
      return callbacks.onStartOverIntent
    case 'delete':
      return callbacks.onOpenDeleteDialog
    case 'focus-selected':
      return callbacks.onFocusSelected
    case 'preset-corner':
      return () => {
        callbacks.onSetCameraPreset('corner')
      }
    case 'preset-front':
      return () => {
        callbacks.onSetCameraPreset('front')
      }
    case 'preset-side':
      return () => {
        callbacks.onSetCameraPreset('side')
      }
    case 'preset-top':
      return () => {
        callbacks.onSetCameraPreset('top')
      }
    case 'move-up':
      return () => {
        callbacks.onMoveSelection({ x: 0, z: -0.5 })
      }
    case 'move-up-large':
      return () => {
        callbacks.onMoveSelection({ x: 0, z: -1 })
      }
    case 'move-up-small':
      return () => {
        callbacks.onMoveSelection({ x: 0, z: -0.1 })
      }
    case 'move-down':
      return () => {
        callbacks.onMoveSelection({ x: 0, z: 0.5 })
      }
    case 'move-down-large':
      return () => {
        callbacks.onMoveSelection({ x: 0, z: 1 })
      }
    case 'move-down-small':
      return () => {
        callbacks.onMoveSelection({ x: 0, z: 0.1 })
      }
    case 'move-left':
      return () => {
        callbacks.onMoveSelection({ x: -0.5, z: 0 })
      }
    case 'move-left-large':
      return () => {
        callbacks.onMoveSelection({ x: -1, z: 0 })
      }
    case 'move-left-small':
      return () => {
        callbacks.onMoveSelection({ x: -0.1, z: 0 })
      }
    case 'move-right':
      return () => {
        callbacks.onMoveSelection({ x: 0.5, z: 0 })
      }
    case 'move-right-large':
      return () => {
        callbacks.onMoveSelection({ x: 1, z: 0 })
      }
    case 'move-right-small':
      return () => {
        callbacks.onMoveSelection({ x: 0.1, z: 0 })
      }
    case 'rotate-left':
      return () => {
        callbacks.onRotate(1)
      }
    case 'rotate-right':
      return () => {
        callbacks.onRotate(-1)
      }
    case 'canvas-browse-next':
      return () => {
        callbacks.onCanvasBrowse('next')
      }
    case 'canvas-browse-prev':
      return () => {
        callbacks.onCanvasBrowse('prev')
      }
    case 'canvas-browse-first':
      return () => {
        callbacks.onCanvasBrowse('first')
      }
    case 'canvas-browse-last':
      return () => {
        callbacks.onCanvasBrowse('last')
      }
    case 'canvas-select-previewed':
      return callbacks.onCanvasSelectPreviewed
    case 'clear-selection':
      return callbacks.onClearSelection
    default:
      return null
  }
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
  const shortcutDefinitions: ShortcutDefinition[] =
    USE_KEYBOARD_SHORTCUT_DEFINITIONS.map((shortcut) => {
      const execute = getShortcutExecutor(shortcut.id, {
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
      })

      if (!execute) {
        throw new Error(`Missing keyboard shortcut executor for ${shortcut.id}`)
      }

      return {
        id: shortcut.id,
        match: shortcut.match,
        allowMatchInEditingTarget: shortcut.allowMatchInEditingTarget,
        requiresRoomViewFocus: shortcut.requiresRoomViewFocus,
        requiresSelection: shortcut.requiresSelection,
        requiresNoSelection: shortcut.requiresNoSelection,
        requiresStartOverCapability: shortcut.requiresStartOverCapability,
        suppressionMode: shortcut.suppressionMode,
        execute,
      }
    })

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
