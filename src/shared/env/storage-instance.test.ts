import { describe, expect, it } from 'vitest'
import { deriveStorageInstance } from './storage-instance'

describe('deriveStorageInstance', () => {
  it('derives no segment from a root base path', () => {
    expect(deriveStorageInstance({ explicit: undefined, basePath: '/' })).toBe(
      '',
    )
  })

  it('trims surrounding slashes from the base path', () => {
    expect(
      deriveStorageInstance({ explicit: undefined, basePath: '/room-layout/' }),
    ).toBe('room-layout')
  })

  it('preserves nested base paths verbatim', () => {
    expect(
      deriveStorageInstance({
        explicit: undefined,
        basePath: '/shop/planner/',
      }),
    ).toBe('shop/planner')
  })

  it('prefers an explicit instance over the base path', () => {
    expect(
      deriveStorageInstance({ explicit: 'e2e', basePath: '/room-layout/' }),
    ).toBe('e2e')
  })

  it('ignores a blank explicit instance', () => {
    expect(
      deriveStorageInstance({ explicit: '   ', basePath: '/room-layout/' }),
    ).toBe('room-layout')
  })

  it('ignores an explicit instance containing angle brackets', () => {
    expect(
      deriveStorageInstance({ explicit: 'a>b', basePath: '/room-layout/' }),
    ).toBe('room-layout')
    expect(
      deriveStorageInstance({ explicit: '<a', basePath: '/room-layout/' }),
    ).toBe('room-layout')
  })
})
