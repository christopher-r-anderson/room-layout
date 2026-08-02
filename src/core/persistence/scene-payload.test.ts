import {
  roundTo3,
  roundRoomSize,
  hasValidScenePayloadFields,
  isFiniteNumber,
  isValidFurnitureInstance,
  toScenePayloadFields,
} from './scene-payload'
import { describe, it, expect } from 'vitest'

describe('scene-payload', () => {
  describe('roundTo3', () => {
    it('rounds numbers to 3 decimal places', () => {
      expect(roundTo3(1.23456)).toBe(1.235)
      expect(roundTo3(1.23444)).toBe(1.234)
      expect(roundTo3(-1.23456)).toBe(-1.235)
    })

    it('handles classic floating-point precision issues (0.1 + 0.2)', () => {
      // 0.1 + 0.2 = 0.30000000000000004 due to binary representation
      const sum = 0.1 + 0.2
      expect(roundTo3(sum)).toBe(0.3)
    })

    it('handles numbers on rounding boundaries affected by precision', () => {
      // Values that might have trailing precision errors
      expect(roundTo3(0.1234999999999999)).toBe(0.123)
      expect(roundTo3(0.1235000000000001)).toBe(0.124)
      expect(roundTo3(1.9995)).toBe(2)
    })

    it('handles negative numbers with precision issues', () => {
      // Negative numbers with binary representation quirks
      expect(roundTo3(-0.1 - 0.2)).toBe(-0.3)
      expect(roundTo3(-1.2349999999999)).toBe(-1.235)
      expect(roundTo3(-1.9995)).toBe(-2)
    })

    it('handles very small numbers close to zero', () => {
      expect(roundTo3(0.0001)).toBe(0)
      expect(roundTo3(0.0005)).toBe(0.001)
      expect(roundTo3(-0.0005)).toBe(-0.001)
    })
  })

  describe('isFiniteNumber', () => {
    it('returns true for finite numbers', () => {
      expect(isFiniteNumber(123)).toBe(true)
      expect(isFiniteNumber(-123.456)).toBe(true)
      expect(isFiniteNumber(0)).toBe(true)
    })

    it('returns false for non-numbers or infinite values', () => {
      expect(isFiniteNumber(Infinity)).toBe(false)
      expect(isFiniteNumber(-Infinity)).toBe(false)
      expect(isFiniteNumber(NaN)).toBe(false)
      expect(isFiniteNumber('123')).toBe(false)
      expect(isFiniteNumber(null)).toBe(false)
      expect(isFiniteNumber(undefined)).toBe(false)
    })
  })

  describe('isValidFurnitureInstance', () => {
    it('returns true for valid furniture instances', () => {
      const validInstance = {
        id: 'furniture1',
        catalogId: 'catalog1',
        rotationY: 45,
        position: [1.23, 4.56, 7.89],
      }
      expect(isValidFurnitureInstance(validInstance)).toBe(true)
    })

    it('returns false for invalid furniture instances', () => {
      const invalidInstances = [
        null,
        {},
        {
          id: '',
          catalogId: 'catalog1',
          rotationY: 45,
          position: [1.23, 4.56, 7.89],
        },
        {
          id: 'furniture1',
          catalogId: '',
          rotationY: 45,
          position: [1.23, 4.56, 7.89],
        },
        {
          id: 'furniture1',
          catalogId: 'catalog1',
          rotationY: '45',
          position: [1.23, 4.56, 7.89],
        },
        {
          id: 'furniture1',
          catalogId: 'catalog1',
          rotationY: 45,
          position: [1.23, 4.56],
        },
        {
          id: 'furniture1',
          catalogId: 'catalog1',
          rotationY: 45,
          position: [1.23, '4.56', 7.89],
        },
      ]

      invalidInstances.forEach((instance) => {
        expect(isValidFurnitureInstance(instance)).toBe(false)
      })
    })
  })

  describe('hasValidScenePayloadFields', () => {
    it('accepts an absent room size', () => {
      expect(hasValidScenePayloadFields({ items: [] })).toBe(true)
    })

    it('accepts a present room size with finite positive dimensions', () => {
      expect(
        hasValidScenePayloadFields({
          items: [],
          roomSize: { width: 4, depth: 5.5, height: 3 },
        }),
      ).toBe(true)
      // Out-of-limits values are still structurally valid: range is
      // load-time policy, applied by the restore normalize.
      expect(
        hasValidScenePayloadFields({
          items: [],
          roomSize: { width: 100, depth: 0.1, height: 50 },
        }),
      ).toBe(true)
    })

    it('rejects a present room size that is malformed', () => {
      const invalid = [
        null,
        'room',
        { width: 4, depth: 5 },
        { width: '4', depth: 5, height: 3 },
        { width: 4, depth: NaN, height: 3 },
        { width: 4, depth: 5, height: Infinity },
        { width: 0, depth: 5, height: 3 },
        { width: -4, depth: 5, height: 3 },
      ]

      invalid.forEach((roomSize) => {
        expect(hasValidScenePayloadFields({ items: [], roomSize })).toBe(false)
      })
    })
  })

  describe('toScenePayloadFields', () => {
    it('omits an absent or default room size', () => {
      expect(toScenePayloadFields([]).roomSize).toBeUndefined()
      expect(
        toScenePayloadFields([], {
          roomSize: { width: 6, depth: 6, height: 2.5 },
        }).roomSize,
      ).toBeUndefined()
    })

    it('rounds a non-default room size to 3 decimals', () => {
      expect(
        toScenePayloadFields([], {
          roomSize: { width: 4.0004, depth: 5, height: 3 },
        }).roomSize,
      ).toEqual({ width: 4, depth: 5, height: 3 })
    })
  })

  describe('roundRoomSize', () => {
    it('rounds each dimension to 3 decimal places', () => {
      expect(
        roundRoomSize({ width: 4.0004, depth: 5.0006, height: 3.0004 }),
      ).toEqual({ width: 4, depth: 5.001, height: 3 })
    })
  })
})
