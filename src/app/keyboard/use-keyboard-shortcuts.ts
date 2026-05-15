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
  isModalOpen: boolean
  hasSelection: boolean
  canStartNewScene: boolean
}

interface ShortcutDefinition {
  id: string
  match: KeyCombo | KeyCombo[]
  allowMatchInEditingTarget?: boolean
  requiresSelection?: boolean
  canExecute?: (context: ShortcutContext) => boolean
  suppressionMode?: SuppressionMode
  execute: () => void
}

interface UseKeyboardShortcutsOptions {
  enabled: boolean
  hasSelection: boolean
  isModalOpen: boolean
  canStartNewScene: boolean
  onUndo: () => void
  onRedo: () => void
  onNewSceneIntent: () => void
  onOpenDeleteDialog: () => void
  onFocusSelected: () => void
  onMoveSelection: (delta: { x: number; z: number }) => void
  onClearSelection: () => void
  onRotate: (direction: RotationDirection) => void
  onSetCameraPreset: (preset: CameraPreset) => void
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
  if (context.isModalOpen) {
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
  isModalOpen,
  canStartNewScene,
  onUndo,
  onRedo,
  onNewSceneIntent,
  onOpenDeleteDialog,
  onFocusSelected,
  onMoveSelection,
  onClearSelection,
  onRotate,
  onSetCameraPreset,
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
      id: 'new-scene',
      match: { key: 'n', ctrlOrMeta: true },
      allowMatchInEditingTarget: true,
      suppressionMode: 'always-on-match',
      canExecute: (context) =>
        context.canStartNewScene && !context.targetIsEditingTarget,
      execute: onNewSceneIntent,
    },
    {
      id: 'delete',
      match: [{ key: 'delete' }, { key: 'backspace' }],
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: onOpenDeleteDialog,
    },
    {
      id: 'focus-selected',
      match: { key: 'f' },
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
      suppressionMode: 'on-execute',
      execute: () => {
        onSetCameraPreset('top')
      },
    },
    {
      id: 'move-up',
      match: { key: 'ArrowUp' },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: -0.5 })
      },
    },
    {
      id: 'move-up-large',
      match: { key: 'ArrowUp', shift: true },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: -1 })
      },
    },
    {
      id: 'move-up-small',
      match: { key: 'ArrowUp', alt: true },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: -0.1 })
      },
    },
    {
      id: 'move-down',
      match: { key: 'ArrowDown' },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: 0.5 })
      },
    },
    {
      id: 'move-down-large',
      match: { key: 'ArrowDown', shift: true },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: 1 })
      },
    },
    {
      id: 'move-down-small',
      match: { key: 'ArrowDown', alt: true },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0, z: 0.1 })
      },
    },
    {
      id: 'move-left',
      match: { key: 'ArrowLeft' },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: -0.5, z: 0 })
      },
    },
    {
      id: 'move-left-large',
      match: { key: 'ArrowLeft', shift: true },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: -1, z: 0 })
      },
    },
    {
      id: 'move-left-small',
      match: { key: 'ArrowLeft', alt: true },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: -0.1, z: 0 })
      },
    },
    {
      id: 'move-right',
      match: { key: 'ArrowRight' },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0.5, z: 0 })
      },
    },
    {
      id: 'move-right-large',
      match: { key: 'ArrowRight', shift: true },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 1, z: 0 })
      },
    },
    {
      id: 'move-right-small',
      match: { key: 'ArrowRight', alt: true },
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onMoveSelection({ x: 0.1, z: 0 })
      },
    },
    {
      id: 'rotate-left',
      match: [{ key: ',' }, { code: 'Comma' }],
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onRotate(1)
      },
    },
    {
      id: 'rotate-right',
      match: [{ key: '.' }, { code: 'Period' }],
      requiresSelection: true,
      suppressionMode: 'on-execute',
      execute: () => {
        onRotate(-1)
      },
    },
    {
      id: 'clear-selection',
      match: { key: 'Escape' },
      requiresSelection: true,
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
      isModalOpen,
      hasSelection,
      canStartNewScene,
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

      // always-on-match: suppress immediately on match
      if (suppressionMode === 'always-on-match') {
        event.preventDefault()
      } else if (canExecute) {
        // on-execute: suppress only if action will execute
        event.preventDefault()
      }

      if (canExecute) {
        shortcut.execute()
      }

      return
    }
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
