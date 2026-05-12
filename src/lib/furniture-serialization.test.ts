import {
  roundTo3,
  isFiniteNumber,
  isValidFurnitureInstance,
} from './furniture-serialization'
import { describe, it, expect } from 'vitest'

describe('furniture-serialization', () => {
  describe('roundTo3', () => {
    it('should round numbers to 3 decimal places', () => {
      expect(roundTo3(1.23456)).toBe(1.235)
      expect(roundTo3(1.23444)).toBe(1.234)
      expect(roundTo3(-1.23456)).toBe(-1.235)
    })

    it('should handle classic floating-point precision issues (0.1 + 0.2)', () => {
      // 0.1 + 0.2 = 0.30000000000000004 due to binary representation
      const sum = 0.1 + 0.2
      expect(roundTo3(sum)).toBe(0.3)
    })

    it('should handle numbers on rounding boundaries affected by precision', () => {
      // Values that might have trailing precision errors
      expect(roundTo3(0.1234999999999999)).toBe(0.123)
      expect(roundTo3(0.1235000000000001)).toBe(0.124)
      expect(roundTo3(1.9995)).toBe(2)
    })

    it('should handle negative numbers with precision issues', () => {
      // Negative numbers with binary representation quirks
      expect(roundTo3(-0.1 - 0.2)).toBe(-0.3)
      expect(roundTo3(-1.2349999999999)).toBe(-1.235)
      expect(roundTo3(-1.9995)).toBe(-2)
    })

    it('should handle very small numbers close to zero', () => {
      expect(roundTo3(0.0001)).toBe(0)
      expect(roundTo3(0.0005)).toBe(0.001)
      expect(roundTo3(-0.0005)).toBe(-0.001)
    })
  })

  describe('isFiniteNumber', () => {
    it('should return true for finite numbers', () => {
      expect(isFiniteNumber(123)).toBe(true)
      expect(isFiniteNumber(-123.456)).toBe(true)
      expect(isFiniteNumber(0)).toBe(true)
    })

    it('should return false for non-numbers or infinite values', () => {
      expect(isFiniteNumber(Infinity)).toBe(false)
      expect(isFiniteNumber(-Infinity)).toBe(false)
      expect(isFiniteNumber(NaN)).toBe(false)
      expect(isFiniteNumber('123')).toBe(false)
      expect(isFiniteNumber(null)).toBe(false)
      expect(isFiniteNumber(undefined)).toBe(false)
    })
  })

  describe('isValidFurnitureInstance', () => {
    it('should return true for valid furniture instances', () => {
      const validInstance = {
        id: 'furniture1',
        catalogId: 'catalog1',
        rotationY: 45,
        position: [1.23, 4.56, 7.89],
      }
      expect(isValidFurnitureInstance(validInstance)).toBe(true)
    })

    it('should return false for invalid furniture instances', () => {
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
})
