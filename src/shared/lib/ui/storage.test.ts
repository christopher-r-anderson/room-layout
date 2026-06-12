// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  loadBooleanPreference,
  loadJsonWithDefault,
  removeKey,
  saveBooleanPreference,
  saveJson,
} from './storage'

const KEY = 'test-pref'
const PREFIXED_KEY = 'room-layout:test-pref'

describe('loadBooleanPreference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns the default when the key is absent', () => {
    expect(loadBooleanPreference(KEY, false)).toBe(false)
    expect(loadBooleanPreference(KEY, true)).toBe(true)
  })

  it('returns true when stored value is "true"', () => {
    window.localStorage.setItem(PREFIXED_KEY, 'true')
    expect(loadBooleanPreference(KEY, false)).toBe(true)
  })

  it('returns false for any value other than "true"', () => {
    window.localStorage.setItem(PREFIXED_KEY, 'false')
    expect(loadBooleanPreference(KEY, true)).toBe(false)

    window.localStorage.setItem(PREFIXED_KEY, 'yes')
    expect(loadBooleanPreference(KEY, true)).toBe(false)
  })

  it('returns the default when localStorage.getItem throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    expect(loadBooleanPreference(KEY, true)).toBe(true)
  })
})

describe('saveBooleanPreference', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('writes the correct prefixed key', () => {
    saveBooleanPreference(KEY, true)
    expect(window.localStorage.getItem(PREFIXED_KEY)).toBe('true')
  })

  it('roundtrips true and false', () => {
    saveBooleanPreference(KEY, true)
    expect(loadBooleanPreference(KEY, false)).toBe(true)

    saveBooleanPreference(KEY, false)
    expect(loadBooleanPreference(KEY, true)).toBe(false)
  })

  it('silently ignores localStorage.setItem throws', () => {
    vi.spyOn(window.localStorage, 'setItem').mockImplementationOnce(() => {
      throw new Error('storage full')
    })
    expect(() => {
      saveBooleanPreference(KEY, true)
    }).not.toThrow()
  })
})

describe('loadJsonWithDefault', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('returns the default when the key is absent', () => {
    expect(loadJsonWithDefault(KEY, { count: 1 })).toEqual({ count: 1 })
  })

  it('parses stored JSON values', () => {
    window.localStorage.setItem(PREFIXED_KEY, JSON.stringify({ count: 2 }))
    expect(loadJsonWithDefault(KEY, { count: 1 })).toEqual({ count: 2 })
  })

  it('returns the default when validation fails', () => {
    window.localStorage.setItem(PREFIXED_KEY, JSON.stringify({ count: 'bad' }))

    expect(
      loadJsonWithDefault(
        KEY,
        { count: 1 },
        (value): value is { count: number } => {
          return (
            typeof value === 'object' &&
            value !== null &&
            'count' in value &&
            typeof (value as { count?: unknown }).count === 'number'
          )
        },
      ),
    ).toEqual({ count: 1 })
  })

  it('returns the default when JSON parsing fails', () => {
    window.localStorage.setItem(PREFIXED_KEY, '{')
    expect(loadJsonWithDefault(KEY, { count: 1 })).toEqual({ count: 1 })
  })

  it('returns the default when localStorage.getItem throws', () => {
    vi.spyOn(window.localStorage, 'getItem').mockImplementationOnce(() => {
      throw new Error('storage unavailable')
    })
    expect(loadJsonWithDefault(KEY, { count: 1 })).toEqual({ count: 1 })
  })
})

describe('saveJson', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('writes the correct prefixed key', () => {
    saveJson(KEY, { count: 3 })
    expect(window.localStorage.getItem(PREFIXED_KEY)).toBe('{"count":3}')
  })
})

describe('removeKey', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('removes the prefixed key', () => {
    window.localStorage.setItem(PREFIXED_KEY, 'true')
    removeKey(KEY)
    expect(window.localStorage.getItem(PREFIXED_KEY)).toBeNull()
  })
})
