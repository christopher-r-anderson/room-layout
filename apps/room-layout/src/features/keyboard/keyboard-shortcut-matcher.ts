export interface KeyCombo {
  key?: string
  code?: string
  ctrlOrMeta?: boolean
  shift?: boolean
  alt?: boolean
}

export function matchKeyCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  const hasKey = typeof combo.key === 'string' && combo.key.length > 0
  const hasCode = typeof combo.code === 'string' && combo.code.length > 0

  if (!hasKey && !hasCode) {
    return false
  }

  const keyMatches =
    !hasKey || event.key.toLowerCase() === combo.key?.toLowerCase()
  const codeMatches =
    !hasCode || event.code.toLowerCase() === combo.code?.toLowerCase()

  return (
    keyMatches &&
    codeMatches &&
    (combo.ctrlOrMeta ?? false) === (event.ctrlKey || event.metaKey) &&
    (combo.shift ?? false) === event.shiftKey &&
    (combo.alt ?? false) === event.altKey
  )
}

export function matchesKeyCombo(
  event: KeyboardEvent,
  match: KeyCombo | KeyCombo[],
): boolean {
  const combos = Array.isArray(match) ? match : [match]
  return combos.some((combo) => matchKeyCombo(event, combo))
}
