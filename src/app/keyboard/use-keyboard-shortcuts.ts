import { useEffect, useEffectEvent } from 'react'
import type { CameraPreset } from '@/scene/scene.types'

export type RotationDirection = -1 | 1

interface ShortcutContext {
  targetIsEditingTarget: boolean
  targetIsInDialog: boolean
  isModalOpen: boolean
  hasSelection: boolean
  canStartNewScene: boolean
}

interface KeyCombo {
  key: string
  ctrlOrMeta?: boolean
  shift?: boolean
  alt?: boolean
}

interface ShortcutDefinition {
  id: string
  match: KeyCombo | KeyCombo[]
  allowMatchInEditingTarget?: boolean
  requiresSelection?: boolean
  canExecute?: (context: ShortcutContext) => boolean
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

function isTextInputLikeTarget(tagName?: string): boolean {
  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

function shouldBlockForTextInput(
  targetTagName?: string,
  targetIsContentEditable?: boolean,
): boolean {
  return (
    targetIsContentEditable === true || isTextInputLikeTarget(targetTagName)
  )
}

function isContentEditableTarget(target: HTMLElement): boolean {
  const contentEditableAttr = target.getAttribute('contenteditable')
  return (
    target.isContentEditable ||
    contentEditableAttr === '' ||
    contentEditableAttr === 'true'
  )
}

function matchKeyCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  return (
    event.key.toLowerCase() === combo.key.toLowerCase() &&
    (combo.ctrlOrMeta ?? false) === (event.ctrlKey || event.metaKey) &&
    (combo.shift ?? false) === event.shiftKey &&
    (combo.alt ?? false) === event.altKey
  )
}

function matchesShortcutCombo(
  event: KeyboardEvent,
  match: KeyCombo | KeyCombo[],
): boolean {
  const combos = Array.isArray(match) ? match : [match]
  return combos.some((combo) => matchKeyCombo(event, combo))
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
      execute: onUndo,
    },
    {
      id: 'redo',
      match: [
        { key: 'z', ctrlOrMeta: true, shift: true },
        { key: 'y', ctrlOrMeta: true },
      ],
      execute: onRedo,
    },
    {
      id: 'new-scene',
      match: { key: 'n', ctrlOrMeta: true },
      allowMatchInEditingTarget: true,
      canExecute: (context) =>
        context.canStartNewScene && !context.targetIsEditingTarget,
      execute: onNewSceneIntent,
    },
    {
      id: 'delete',
      match: [{ key: 'delete' }, { key: 'backspace' }],
      requiresSelection: true,
      execute: onOpenDeleteDialog,
    },
    {
      id: 'focus-selected',
      match: { key: 'f' },
      requiresSelection: true,
      execute: onFocusSelected,
    },
    {
      id: 'preset-corner',
      match: { key: '1' },
      execute: () => {
        onSetCameraPreset('corner')
      },
    },
    {
      id: 'preset-front',
      match: { key: '2' },
      execute: () => {
        onSetCameraPreset('front')
      },
    },
    {
      id: 'preset-side',
      match: { key: '3' },
      execute: () => {
        onSetCameraPreset('side')
      },
    },
    {
      id: 'preset-top',
      match: { key: '4' },
      execute: () => {
        onSetCameraPreset('top')
      },
    },
    {
      id: 'move-up',
      match: { key: 'ArrowUp' },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: 0, z: -0.5 })
      },
    },
    {
      id: 'move-up-large',
      match: { key: 'ArrowUp', shift: true },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: 0, z: -1 })
      },
    },
    {
      id: 'move-up-small',
      match: { key: 'ArrowUp', alt: true },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: 0, z: -0.1 })
      },
    },
    {
      id: 'move-down',
      match: { key: 'ArrowDown' },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: 0, z: 0.5 })
      },
    },
    {
      id: 'move-down-large',
      match: { key: 'ArrowDown', shift: true },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: 0, z: 1 })
      },
    },
    {
      id: 'move-down-small',
      match: { key: 'ArrowDown', alt: true },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: 0, z: 0.1 })
      },
    },
    {
      id: 'move-left',
      match: { key: 'ArrowLeft' },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: -0.5, z: 0 })
      },
    },
    {
      id: 'move-left-large',
      match: { key: 'ArrowLeft', shift: true },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: -1, z: 0 })
      },
    },
    {
      id: 'move-left-small',
      match: { key: 'ArrowLeft', alt: true },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: -0.1, z: 0 })
      },
    },
    {
      id: 'move-right',
      match: { key: 'ArrowRight' },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: 0.5, z: 0 })
      },
    },
    {
      id: 'move-right-large',
      match: { key: 'ArrowRight', shift: true },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: 1, z: 0 })
      },
    },
    {
      id: 'move-right-small',
      match: { key: 'ArrowRight', alt: true },
      requiresSelection: true,
      execute: () => {
        onMoveSelection({ x: 0.1, z: 0 })
      },
    },
    {
      id: 'rotate-left',
      match: { key: 'q' },
      requiresSelection: true,
      execute: () => {
        onRotate(1)
      },
    },
    {
      id: 'rotate-right',
      match: { key: 'e' },
      requiresSelection: true,
      execute: () => {
        onRotate(-1)
      },
    },
    {
      id: 'clear-selection',
      match: { key: 'Escape' },
      requiresSelection: true,
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
      targetIsInDialog: target
        ? Boolean(target.closest('[role="dialog"], [role="alertdialog"]'))
        : false,
      isModalOpen,
      hasSelection,
      canStartNewScene,
    }

    for (const shortcut of shortcutDefinitions) {
      if (!canMatchShortcut(shortcut, context)) {
        continue
      }

      if (!matchesShortcutCombo(event, shortcut.match)) {
        continue
      }

      event.preventDefault()

      if (canExecuteShortcut(shortcut, context)) {
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
