interface DeleteHotkeyInput {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
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

export function getDeleteHotkeyIntent({
  key,
  altKey,
  ctrlKey,
  metaKey,
  isModalOpen,
  targetTagName,
  targetIsContentEditable,
}: DeleteHotkeyInput) {
  if (isModalOpen) {
    return false
  }

  if (altKey || ctrlKey || metaKey) {
    return false
  }

  if (targetIsContentEditable || isTextInputLikeTarget(targetTagName)) {
    return false
  }

  const normalizedKey = key.toLowerCase()

  return normalizedKey === 'delete' || normalizedKey === 'backspace'
}
