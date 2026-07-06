import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  resetToolbarInteractionStore,
  selectToolbarEngaged,
  toolbarInteractionActions,
  toolbarInteractionStoreForTests,
} from './toolbar-interaction-store'

const engaged = () =>
  selectToolbarEngaged(toolbarInteractionStoreForTests.getState())

beforeEach(() => {
  vi.useFakeTimers()
  resetToolbarInteractionStore()
})

afterEach(() => {
  resetToolbarInteractionStore()
  vi.useRealTimers()
})

describe('useToolbarInteractionStore', () => {
  it('is not engaged at rest', () => {
    expect(engaged()).toBe(false)
  })

  it('is engaged while the pointer is over the toolbar', () => {
    toolbarInteractionActions.setPointerOver(true)
    expect(engaged()).toBe(true)

    toolbarInteractionActions.setPointerOver(false)
    expect(engaged()).toBe(false)
  })

  it('is engaged while focus is within the toolbar', () => {
    toolbarInteractionActions.setFocusWithin(true)
    expect(engaged()).toBe(true)

    toolbarInteractionActions.setFocusWithin(false)
    expect(engaged()).toBe(false)
  })

  it('stays engaged for the grace window after a rotation, then releases', () => {
    toolbarInteractionActions.reportRotation()
    expect(engaged()).toBe(true)

    vi.advanceTimersByTime(599)
    expect(engaged()).toBe(true)

    vi.advanceTimersByTime(1)
    expect(engaged()).toBe(false)
  })

  it('extends the grace window when rotations repeat', () => {
    toolbarInteractionActions.reportRotation()
    vi.advanceTimersByTime(400)
    toolbarInteractionActions.reportRotation()

    // The first window would have elapsed by now, but the second refreshed it.
    vi.advanceTimersByTime(400)
    expect(engaged()).toBe(true)

    vi.advanceTimersByTime(200)
    expect(engaged()).toBe(false)
  })

  it('stays engaged past the grace window while still hovered', () => {
    toolbarInteractionActions.setPointerOver(true)
    toolbarInteractionActions.reportRotation()

    vi.advanceTimersByTime(600)
    expect(engaged()).toBe(true)

    toolbarInteractionActions.setPointerOver(false)
    expect(engaged()).toBe(false)
  })

  it('reset clears engagement and the pending grace timer', () => {
    toolbarInteractionActions.setPointerOver(true)
    toolbarInteractionActions.reportRotation()

    resetToolbarInteractionStore()
    expect(engaged()).toBe(false)

    // A lingering grace timer would have flipped state back; advancing proves it
    // was cancelled.
    vi.advanceTimersByTime(600)
    expect(engaged()).toBe(false)
  })

  it('exposes reset on the actions, clearing all engagement including grace', () => {
    toolbarInteractionActions.setPointerOver(true)
    toolbarInteractionActions.setFocusWithin(true)
    toolbarInteractionActions.reportRotation()

    toolbarInteractionActions.reset()
    expect(engaged()).toBe(false)

    vi.advanceTimersByTime(600)
    expect(engaged()).toBe(false)
  })
})
