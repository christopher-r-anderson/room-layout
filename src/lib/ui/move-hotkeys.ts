interface MoveHotkeyInput {
  key: string
  altKey: boolean
  ctrlKey: boolean
  metaKey: boolean
  shiftKey: boolean
  isModalOpen?: boolean
  targetTagName?: string
  targetIsContentEditable?: boolean
}

export interface MoveHotkeyIntent {
  delta: {
    x: number
    z: number
  }
  step: number
}

function isTextInputLikeTarget(tagName: string | undefined) {
  if (!tagName) {
    return false
  }

  return tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT'
}

function getMoveStep({
  altKey,
  shiftKey,
}: {
  altKey: boolean
  shiftKey: boolean
}) {
  if (shiftKey) {
    return 1
  }

  if (altKey) {
    return 0.1
  }

  return 0.5
}

export function getMoveHotkeyIntent({
  key,
  altKey,
  ctrlKey,
  metaKey,
  shiftKey,
  isModalOpen,
  targetTagName,
  targetIsContentEditable,
}: MoveHotkeyInput): MoveHotkeyIntent | null {
  if (isModalOpen) {
    return null
  }

  if (ctrlKey || metaKey) {
    return null
  }

  if (targetIsContentEditable || isTextInputLikeTarget(targetTagName)) {
    return null
  }

  const step = getMoveStep({ altKey, shiftKey })

  switch (key) {
    case 'ArrowUp':
      return { delta: { x: 0, z: -step }, step }
    case 'ArrowDown':
      return { delta: { x: 0, z: step }, step }
    case 'ArrowLeft':
      return { delta: { x: -step, z: 0 }, step }
    case 'ArrowRight':
      return { delta: { x: step, z: 0 }, step }
    default:
      return null
  }
}
