export type HistoryHotkeyIntent = 'undo' | 'redo'

interface HistoryHotkeyInput {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  isModalOpen?: boolean
  targetTagName?: string
  targetIsContentEditable?: boolean
}

function isTextInputLikeTarget(tagName: string | undefined) {
  if (!tagName) {
    return false
  }

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

export function getHistoryHotkeyIntent({
  key,
  altKey,
  ctrlKey,
  metaKey,
  shiftKey,
  isModalOpen,
  targetTagName,
  targetIsContentEditable,
}: HistoryHotkeyInput): HistoryHotkeyIntent | null {
  if (isModalOpen) {
    return null
  }

  if (
    altKey ||
    targetIsContentEditable ||
    isTextInputLikeTarget(targetTagName)
  ) {
    return null
  }

  const hasUndoModifier = ctrlKey || metaKey

  if (!hasUndoModifier) {
    return null
  }

  const normalizedKey = key.toLowerCase()

  if (normalizedKey === 'z') {
    return shiftKey ? 'redo' : 'undo'
  }

  if (normalizedKey === 'y' && ctrlKey && !metaKey && !shiftKey) {
    return 'redo'
  }

  return null
}
