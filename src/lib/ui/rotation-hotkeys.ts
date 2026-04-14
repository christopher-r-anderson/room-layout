export type RotationDirection = -1 | 1

interface RotationHotkeyInput {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  targetTagName?: string
  targetIsContentEditable?: boolean
}

const ROTATE_LEFT_KEY = 'q'
const ROTATE_RIGHT_KEY = 'e'

function getRotationDirectionForKey(key: string): RotationDirection | null {
  const normalizedKey = key.toLowerCase()

  if (normalizedKey === ROTATE_LEFT_KEY) {
    return -1
  }

  if (normalizedKey === ROTATE_RIGHT_KEY) {
    return 1
  }

  return null
}

function isTextInputLikeTarget(tagName: string | undefined) {
  if (!tagName) {
    return false
  }

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

export function getRotationHotkeyDirection({
  key,
  altKey,
  ctrlKey,
  metaKey,
  targetTagName,
  targetIsContentEditable,
}: RotationHotkeyInput): RotationDirection | null {
  if (altKey || ctrlKey || metaKey) {
    return null
  }

  if (targetIsContentEditable || isTextInputLikeTarget(targetTagName)) {
    return null
  }

  return getRotationDirectionForKey(key)
}
