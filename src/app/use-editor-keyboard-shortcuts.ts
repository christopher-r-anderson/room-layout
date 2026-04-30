import { useEffect, useEffectEvent } from 'react'
import { getDeleteHotkeyIntent } from '@/lib/ui/delete-hotkeys'
import { getHistoryHotkeyIntent } from '@/lib/ui/history-hotkeys'
import { getMoveHotkeyIntent } from '@/lib/ui/move-hotkeys'
import {
  getRotationHotkeyDirection,
  type RotationDirection,
} from '@/lib/ui/rotation-hotkeys'

interface UseEditorKeyboardShortcutsOptions {
  enabled: boolean
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  isModalOpen: boolean
  onUndo: () => void
  onRedo: () => void
  onOpenDeleteDialog: () => void
  onMoveSelection: (delta: { x: number; z: number }) => void
  onClearSelection: () => void
  onRotate: (direction: RotationDirection) => void
}

export function useEditorKeyboardShortcuts({
  enabled,
  canUndo,
  canRedo,
  hasSelection,
  isModalOpen,
  onUndo,
  onRedo,
  onOpenDeleteDialog,
  onMoveSelection,
  onClearSelection,
  onRotate,
}: UseEditorKeyboardShortcutsOptions): void {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) {
      return
    }

    if (event.defaultPrevented) {
      return
    }

    const target = event.target
    const targetTagName =
      target instanceof HTMLElement ? target.tagName : undefined
    const targetIsContentEditable =
      target instanceof HTMLElement ? target.isContentEditable : false
    const targetIsInDialog =
      target instanceof HTMLElement
        ? Boolean(target.closest('[role="dialog"], [role="alertdialog"]'))
        : false
    const historyIntent = getHistoryHotkeyIntent({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      isModalOpen,
      targetTagName,
      targetIsContentEditable,
    })
    const deleteIntent = getDeleteHotkeyIntent({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      isModalOpen,
      targetTagName,
      targetIsContentEditable,
    })
    const rotationDirection = getRotationHotkeyDirection({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      isModalOpen,
      targetTagName,
      targetIsContentEditable,
    })
    const moveIntent = getMoveHotkeyIntent({
      key: event.key,
      altKey: event.altKey,
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
      isModalOpen,
      targetTagName,
      targetIsContentEditable,
    })
    const canClearSelection =
      event.key === 'Escape' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey &&
      !isModalOpen &&
      !targetIsInDialog &&
      !targetIsContentEditable &&
      targetTagName !== 'INPUT' &&
      targetTagName !== 'TEXTAREA' &&
      targetTagName !== 'SELECT'

    if (historyIntent === 'undo' && canUndo) {
      event.preventDefault()
      onUndo()
      return
    }

    if (historyIntent === 'redo' && canRedo) {
      event.preventDefault()
      onRedo()
      return
    }

    if (hasSelection && deleteIntent) {
      event.preventDefault()
      onOpenDeleteDialog()
      return
    }

    if (!hasSelection || !rotationDirection) {
      if (hasSelection && moveIntent) {
        event.preventDefault()
        onMoveSelection(moveIntent.delta)
        return
      }

      if (hasSelection && canClearSelection) {
        event.preventDefault()
        onClearSelection()
        return
      }

      return
    }

    event.preventDefault()
    onRotate(rotationDirection)
  })

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
}
