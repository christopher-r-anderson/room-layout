import type { FurnitureInstance } from '@/domain/furniture'

/**
 * Rounds a number to 3 decimal places using toFixed() for robust floating-point handling.
 * Avoids intermediate precision errors from arithmetic operations on binary-represented decimals.
 */
export function roundTo3(n: number): number {
  return parseFloat(n.toFixed(3))
}

/**
 * Type guard to check if a value is a finite number.
 * Used in validation to ensure position and rotation values are valid.
 */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && isFinite(value)
}

/**
 * Type guard to validate furniture instance shape.
 * Ensures all required properties are present and have correct types.
 * Does not validate catalog references - that's done separately.
 */
export function isValidFurnitureInstance(
  value: unknown,
): value is FurnitureInstance {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  if (typeof v.id !== 'string' || v.id.length === 0) return false
  if (typeof v.catalogId !== 'string' || v.catalogId.length === 0) return false
  if (!isFiniteNumber(v.rotationY)) return false
  if (
    !Array.isArray(v.position) ||
    v.position.length !== 3 ||
    !v.position.every(isFiniteNumber)
  )
    return false
  return true
}
