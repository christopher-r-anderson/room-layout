interface NewSceneHotkeyInput {
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

export function getNewSceneHotkeyIntent({
  key,
  altKey,
  ctrlKey,
  metaKey,
  shiftKey,
  isModalOpen,
  targetTagName,
  targetIsContentEditable,
}: NewSceneHotkeyInput) {
  if (isModalOpen) {
    return false
  }

  if (altKey || shiftKey) {
    return false
  }

  if (!ctrlKey && !metaKey) {
    return false
  }

  if (targetIsContentEditable || isTextInputLikeTarget(targetTagName)) {
    return false
  }

  return key.toLowerCase() === 'n'
}
