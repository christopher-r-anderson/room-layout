export interface HistoryState<T> {
  past: T[]
  present: T
  future: T[]
}

type EqualityFn<T> = (left: T, right: T) => boolean

function areEqual<T>(left: T, right: T, equalityFn: EqualityFn<T> = Object.is) {
  return equalityFn(left, right)
}

export function createHistoryState<T>(initialPresent: T): HistoryState<T> {
  return {
    past: [],
    present: initialPresent,
    future: [],
  }
}

export function replaceHistoryPresent<T>(
  history: HistoryState<T>,
  nextPresent: T,
  equalityFn?: EqualityFn<T>,
): HistoryState<T> {
  if (areEqual(history.present, nextPresent, equalityFn)) {
    return history
  }

  return {
    ...history,
    present: nextPresent,
  }
}

export function commitHistoryPresent<T>(
  history: HistoryState<T>,
  nextPresent: T,
  equalityFn?: EqualityFn<T>,
): HistoryState<T> {
  if (areEqual(history.present, nextPresent, equalityFn)) {
    return history
  }

  return {
    past: [...history.past, history.present],
    present: nextPresent,
    future: [],
  }
}

export function finalizeHistoryPresent<T>(
  history: HistoryState<T>,
  previousPresent: T,
  equalityFn?: EqualityFn<T>,
): HistoryState<T> {
  if (areEqual(previousPresent, history.present, equalityFn)) {
    return history
  }

  return {
    past: [...history.past, previousPresent],
    present: history.present,
    future: [],
  }
}

export function undoHistoryState<T>(history: HistoryState<T>): HistoryState<T> {
  const previousPresent = history.past.at(-1)

  if (previousPresent === undefined) {
    return history
  }

  return {
    past: history.past.slice(0, -1),
    present: previousPresent,
    future: [history.present, ...history.future],
  }
}

export function redoHistoryState<T>(history: HistoryState<T>): HistoryState<T> {
  const [nextPresent, ...remainingFuture] = history.future

  if (nextPresent === undefined) {
    return history
  }

  return {
    past: [...history.past, history.present],
    present: nextPresent,
    future: remainingFuture,
  }
}

export function canUndoHistory(history: HistoryState<unknown>) {
  return history.past.length > 0
}

export function canRedoHistory(history: HistoryState<unknown>) {
  return history.future.length > 0
}
