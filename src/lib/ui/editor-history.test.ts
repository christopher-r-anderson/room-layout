import { describe, expect, it } from 'vitest'
import {
  canRedoHistory,
  canUndoHistory,
  commitHistoryPresent,
  createHistoryState,
  finalizeHistoryPresent,
  redoHistoryState,
  replaceHistoryPresent,
  undoHistoryState,
} from './editor-history'

describe('editor history', () => {
  it('commits a new present into the undo stack', () => {
    const initial = createHistoryState({ value: 1 })
    const updated = commitHistoryPresent(initial, { value: 2 })

    expect(updated.past).toEqual([{ value: 1 }])
    expect(updated.present).toEqual({ value: 2 })
    expect(updated.future).toEqual([])
  })

  it('does not commit duplicate states', () => {
    const initial = createHistoryState({ value: 1 })
    const updated = commitHistoryPresent(
      initial,
      { value: 1 },
      (left, right) => left.value === right.value,
    )

    expect(updated).toBe(initial)
  })

  it('replaces the present state without growing history', () => {
    const initial = createHistoryState({ value: 1 })
    const updated = replaceHistoryPresent(initial, { value: 2 })

    expect(updated.past).toEqual([])
    expect(updated.present).toEqual({ value: 2 })
    expect(updated.future).toEqual([])
  })

  it('finalizes transient updates into a single undo step', () => {
    const initial = createHistoryState({ value: 1 })
    const dragging = replaceHistoryPresent(initial, { value: 3 })
    const finalized = finalizeHistoryPresent(dragging, initial.present)

    expect(finalized.past).toEqual([{ value: 1 }])
    expect(finalized.present).toEqual({ value: 3 })
    expect(finalized.future).toEqual([])
  })

  it('skips finalizing when the transient state did not change', () => {
    const initial = createHistoryState({ value: 1 })
    const finalized = finalizeHistoryPresent(initial, initial.present)

    expect(finalized).toBe(initial)
  })

  it('supports undo and redo traversal', () => {
    const initial = createHistoryState({ value: 1 })
    const second = commitHistoryPresent(initial, { value: 2 })
    const third = commitHistoryPresent(second, { value: 3 })
    const undone = undoHistoryState(third)
    const redone = redoHistoryState(undone)

    expect(canUndoHistory(third)).toBe(true)
    expect(canRedoHistory(third)).toBe(false)
    expect(undone.present).toEqual({ value: 2 })
    expect(undone.future).toEqual([{ value: 3 }])
    expect(redone.present).toEqual({ value: 3 })
  })
})
