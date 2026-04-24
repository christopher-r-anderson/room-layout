import { useEffect, useEffectEvent } from 'react'
import { getDeleteHotkeyIntent } from '@/lib/ui/delete-hotkeys'
import { getHistoryHotkeyIntent } from '@/lib/ui/history-hotkeys'
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
  onRotate,
}: UseEditorKeyboardShortcutsOptions): void {
  const handleKeyDown = useEffectEvent((event: KeyboardEvent) => {
    if (!enabled) {
      return
    }

    const target = event.target
    const targetTagName =
      target instanceof HTMLElement ? target.tagName : undefined
    const targetIsContentEditable =
      target instanceof HTMLElement ? target.isContentEditable : false
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
