const APP_STORAGE_PREFIX = 'room-layout'

function makeStorageKey(key: string) {
  return `${APP_STORAGE_PREFIX}:${key}`
}

export function loadBooleanPreference(
  key: string,
  defaultValue: boolean,
): boolean {
  if (typeof window === 'undefined') {
    return defaultValue
  }

  try {
    const storedValue = window.localStorage.getItem(makeStorageKey(key))

    if (storedValue === null) {
      return defaultValue
    }

    return storedValue === 'true'
  } catch {
    return defaultValue
  }
}

export function saveBooleanPreference(key: string, value: boolean) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(makeStorageKey(key), String(value))
  } catch {
    // Ignore storage failures so UI controls still work in restricted contexts.
  }
}
