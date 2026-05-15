export interface KeyCombo {
  key: string
  ctrlOrMeta?: boolean
  shift?: boolean
  alt?: boolean
}

export function matchKeyCombo(event: KeyboardEvent, combo: KeyCombo): boolean {
  return (
    event.key.toLowerCase() === combo.key.toLowerCase() &&
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
