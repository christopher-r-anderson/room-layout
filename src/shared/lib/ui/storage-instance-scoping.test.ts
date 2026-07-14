// @vitest-environment jsdom

// Key scoping under a non-empty storage instance; the sibling storage test
// covers the dev shape, where the instance segment is empty. The setup file
// imports the storage module (via i18n), so a fresh instance requires stubbing
// the env var and re-importing rather than vi.mock.

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const KEY = 'test-pref'
const SCOPED_KEY = 'room-layout:test-instance:test-pref'

async function importScopedStorage() {
  vi.stubEnv('VITE_STORAGE_INSTANCE', 'test-instance')
  vi.resetModules()
  return import('./storage')
}

describe('storage keys with an instance segment', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.unstubAllEnvs()
    vi.resetModules()
  })

  it('writes under the instance-scoped key', async () => {
    const { saveJson } = await importScopedStorage()
    saveJson(KEY, { count: 3 })
    expect(window.localStorage.getItem(SCOPED_KEY)).toBe('{"count":3}')
  })

  it('reads from the instance-scoped key', async () => {
    const { loadStringPreference } = await importScopedStorage()
    window.localStorage.setItem(SCOPED_KEY, 'stored')
    expect(loadStringPreference(KEY)).toBe('stored')
  })

  it('does not read an unscoped key', async () => {
    const { loadStringPreference } = await importScopedStorage()
    window.localStorage.setItem('room-layout:test-pref', 'unscoped')
    expect(loadStringPreference(KEY)).toBeNull()
  })

  it('removes the instance-scoped key', async () => {
    const { removeKey } = await importScopedStorage()
    window.localStorage.setItem(SCOPED_KEY, 'stored')
    removeKey(KEY)
    expect(window.localStorage.getItem(SCOPED_KEY)).toBeNull()
  })
})
