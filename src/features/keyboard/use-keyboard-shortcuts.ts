import { useEffect, useEffectEvent } from 'react'
import type { EditorCommand } from '@/core/commands/editor-command'
import type { CommandDispatch } from '@/core/commands/command-dispatch-context'
import {
  isContentEditableTarget,
  isDialogTarget,
  isTextInputLikeTagName,
} from './keyboard-event-target'
import { matchesKeyCombo, type KeyCombo } from './keyboard-shortcut-matcher'
import {
  USE_KEYBOARD_SHORTCUT_DEFINITIONS,
  type SuppressionMode,
} from './keyboard-shortcuts.definitions'

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
  command: EditorCommand
}

interface UseKeyboardShortcutsOptions {
  enabled: boolean
  hasSelection: boolean
  isBlockingOverlayOpen: boolean
  canStartOver: boolean
  roomViewHasFocus: boolean
  dispatch: CommandDispatch
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

export function useKeyboardShortcuts({
  enabled,
  hasSelection,
  isBlockingOverlayOpen,
  canStartOver,
  roomViewHasFocus,
  dispatch,
}: UseKeyboardShortcutsOptions): void {
  const shortcutDefinitions: ShortcutDefinition[] =
    USE_KEYBOARD_SHORTCUT_DEFINITIONS.map((shortcut) => {
      if (!shortcut.command) {
        throw new Error(`Missing command for ${shortcut.id}`)
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
        command: shortcut.command,
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
          dispatch(shortcut.command)
        }
        return
      }

      // on-execute: suppress and stop only if the action will actually run
      if (canExecute) {
        event.preventDefault()
        dispatch(shortcut.command)
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
