import { STORAGE_INSTANCE } from '@/shared/env/storage-instance'

const APP_STORAGE_PREFIX = 'room-layout'

function makeStorageKey(key: string) {
  const instanceSegment = STORAGE_INSTANCE ? `:${STORAGE_INSTANCE}` : ''
  return `${APP_STORAGE_PREFIX}${instanceSegment}:${key}`
}

export type StorageValidator<T> = (value: unknown) => value is T

function readLocalStorageValue(key: string): string | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(makeStorageKey(key))
  } catch {
    return null
  }
}

function writeLocalStorageValue(key: string, value: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(makeStorageKey(key), value)
  } catch {
    // Ignore storage failures so UI controls still work in restricted contexts.
  }
}

function removeLocalStorageValue(key: string): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.removeItem(makeStorageKey(key))
  } catch {
    // Ignore storage failures so UI controls still work in restricted contexts.
  }
}

export function loadJsonWithDefault<T>(
  key: string,
  defaultValue: T,
  validator?: StorageValidator<T>,
): T {
  const storedValue = readLocalStorageValue(key)

  if (storedValue === null) {
    return defaultValue
  }

  try {
    const parsedValue: unknown = JSON.parse(storedValue)

    if (validator && !validator(parsedValue)) {
      return defaultValue
    }

    return parsedValue as T
  } catch {
    return defaultValue
  }
}

export function saveJson(key: string, value: unknown): void {
  writeLocalStorageValue(key, JSON.stringify(value))
}

export function removeKey(key: string): void {
  removeLocalStorageValue(key)
}

export function loadStringPreference(key: string): string | null {
  return readLocalStorageValue(key)
}

export function loadBooleanPreference(
  key: string,
  defaultValue: boolean,
): boolean {
  const storedValue = readLocalStorageValue(key)

  if (storedValue === null) {
    return defaultValue
  }

  return storedValue === 'true'
}

export function saveBooleanPreference(key: string, value: boolean) {
  saveJson(key, value)
}
