import { describe, expect, it } from 'vitest'
import { anchorNameFromId, parseAriaShortcuts } from './utils'

describe('anchorNameFromId', () => {
  it('prefixes values with a CSS custom property marker', () => {
    expect(anchorNameFromId('abc123')).toBe('--abc123')
  })

  it('preserves allowed identifier characters', () => {
    expect(anchorNameFromId('A_z-09')).toBe('--A_z-09')
  })

  it('replaces disallowed characters with underscores', () => {
    expect(anchorNameFromId(':r0:/foo bar')).toBe('--_r0__foo_bar')
  })
})

describe('parseAriaShortcuts', () => {
  it('parses single key shortcuts', () => {
    expect(parseAriaShortcuts('A')).toEqual([['A']])
  })

  it('parses complex key combinations', () => {
    expect(parseAriaShortcuts('Control+S')).toEqual([['Control', 'S']])
  })

  it('parses multiple space-separated shortcuts', () => {
    const input = 'Control+P Shift+Space Q'
    const expected = [['Control', 'P'], ['Shift', 'Space'], ['Q']]
    expect(parseAriaShortcuts(input)).toEqual(expected)
  })

  it('handles empty strings, undefineds, and nulls', () => {
    expect(parseAriaShortcuts('')).toEqual([])
    expect(parseAriaShortcuts(null)).toEqual([])
    expect(parseAriaShortcuts(undefined)).toEqual([])
  })
})
