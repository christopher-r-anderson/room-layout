import { describe, expect, it, vi } from 'vitest'
import { createReconciler } from './reconciler'

describe('createReconciler', () => {
  it('reuses the active subscription across repeated starts', () => {
    const setup = vi.fn(() => [() => undefined])
    const start = createReconciler(setup)

    const stop = start()
    expect(start()).toBe(stop)
    expect(setup).toHaveBeenCalledTimes(1)
  })

  it('runs every cleanup on stop and allows a fresh start afterwards', () => {
    const first = vi.fn()
    const second = vi.fn()
    const setup = vi.fn(() => [first, second])
    const start = createReconciler(setup)

    start()()
    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)

    start()
    expect(setup).toHaveBeenCalledTimes(2)
  })
})
