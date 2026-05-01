// @vitest-environment jsdom

import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loadBooleanPreference, saveBooleanPreference } from './storage'

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
