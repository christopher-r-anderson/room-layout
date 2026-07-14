import { describe, expect, it } from 'vitest'
import { deriveStorageInstance } from './storage-instance'

describe('deriveStorageInstance', () => {
  it('derives no segment from a root base path', () => {
    expect(deriveStorageInstance({ explicit: undefined, basePath: '/' })).toBe(
      '',
    )
  })

  it('derives the segment from the base path', () => {
    expect(
      deriveStorageInstance({ explicit: undefined, basePath: '/room-layout/' }),
    ).toBe('room-layout')
  })

  it('joins nested base path segments with dots', () => {
    expect(
      deriveStorageInstance({
        explicit: undefined,
        basePath: '/shop/planner/',
      }),
    ).toBe('shop.planner')
  })

  it('keeps nested and hyphenated base paths distinct', () => {
    expect(
      deriveStorageInstance({
        explicit: undefined,
        basePath: '/shop-planner/',
      }),
    ).toBe('shop-planner')
  })

  it('keeps nested and dotted base paths distinct', () => {
    expect(
      deriveStorageInstance({ explicit: undefined, basePath: '/a.b/' }),
    ).toBe('a-b')
    expect(
      deriveStorageInstance({ explicit: undefined, basePath: '/a/b/' }),
    ).toBe('a.b')
  })

  it('prefers an explicit instance over the base path', () => {
    expect(
      deriveStorageInstance({ explicit: 'e2e', basePath: '/room-layout/' }),
    ).toBe('e2e')
  })

  it('sanitizes mixed case and unsafe characters', () => {
    expect(
      deriveStorageInstance({ explicit: 'Shop A/Living Room!', basePath: '/' }),
    ).toBe('shop-a-living-room')
  })

  it('falls back to the base path when the explicit value sanitizes to nothing', () => {
    expect(
      deriveStorageInstance({ explicit: '///', basePath: '/room-layout/' }),
    ).toBe('room-layout')
  })

  it('caps over-length values', () => {
    const explicit = 'a'.repeat(80)
    expect(
      deriveStorageInstance({ explicit, basePath: '/' }).length,
    ).toBeLessThanOrEqual(64)
  })
})
