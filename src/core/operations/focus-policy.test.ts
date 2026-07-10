import { expect, it } from 'vitest'
import {
  resolveFocusIntent,
  type FocusGestureOrigin,
  type FocusIntent,
  type FocusResolveContext,
} from './focus-policy'

// The full focus-routing policy table lives here: one assertion per cell.

const DESKTOP: FocusResolveContext = { layout: 'desktop', hasSelection: true }
const DESKTOP_EMPTY: FocusResolveContext = {
  layout: 'desktop',
  hasSelection: false,
}
const MOBILE: FocusResolveContext = { layout: 'mobile', hasSelection: true }
const MOBILE_EMPTY: FocusResolveContext = {
  layout: 'mobile',
  hasSelection: false,
}

const NO_ORIGIN: FocusGestureOrigin = { modality: null, surface: 'unknown' }

function keyboard(surface: FocusGestureOrigin['surface']): FocusGestureOrigin {
  return { modality: 'keyboard', surface }
}

function pointer(surface: FocusGestureOrigin['surface']): FocusGestureOrigin {
  return { modality: 'pointer', surface }
}

function surfaceIntent(
  surface: 'scene' | 'item-collection' | 'inspector' | 'item-actions',
): FocusIntent {
  return { kind: 'surface', surface }
}

const deleteIntent: FocusIntent = {
  kind: 'selected-item',
  operation: 'delete',
  neighborIndex: 2,
}

function historyIntent(targetItemId: string | null): FocusIntent {
  return { kind: 'selected-item', operation: 'history', targetItemId }
}

// --- Surface intents (explicit pane commands) ---

it('routes a scene intent to the scene in both layouts', () => {
  for (const context of [DESKTOP, MOBILE]) {
    expect(
      resolveFocusIntent(surfaceIntent('scene'), NO_ORIGIN, context),
    ).toEqual({
      directive: { surface: 'scene' },
      announcement: null,
    })
  }
})

it('routes an item-collection intent to the collection on desktop', () => {
  expect(
    resolveFocusIntent(surfaceIntent('item-collection'), NO_ORIGIN, DESKTOP),
  ).toEqual({
    directive: { surface: 'item-collection', target: { kind: 'auto' } },
    announcement: null,
  })
})

it('drops an item-collection intent on mobile and announces the missing list', () => {
  expect(
    resolveFocusIntent(surfaceIntent('item-collection'), NO_ORIGIN, MOBILE),
  ).toEqual({
    directive: null,
    announcement: 'list-unavailable',
  })
})

it('routes inspector and item-actions intents to their surfaces while selected', () => {
  for (const surface of ['inspector', 'item-actions'] as const) {
    for (const context of [DESKTOP, MOBILE]) {
      expect(
        resolveFocusIntent(surfaceIntent(surface), NO_ORIGIN, context),
      ).toEqual({
        directive: { surface },
        announcement: null,
      })
    }
  }
})

it('falls back to the collection with an announcement for selection-bound intents on an empty desktop selection', () => {
  for (const surface of ['inspector', 'item-actions'] as const) {
    expect(
      resolveFocusIntent(surfaceIntent(surface), NO_ORIGIN, DESKTOP_EMPTY),
    ).toEqual({
      directive: { surface: 'item-collection', target: { kind: 'auto' } },
      announcement: 'no-selection-moved-to-list',
    })
  }
})

it('drops selection-bound intents with an announcement on an empty mobile selection', () => {
  for (const surface of ['inspector', 'item-actions'] as const) {
    expect(
      resolveFocusIntent(surfaceIntent(surface), NO_ORIGIN, MOBILE_EMPTY),
    ).toEqual({
      directive: null,
      announcement: 'no-selection',
    })
  }
})

// --- Delete: the focused control is destroyed, so focus is always repaired ---

it('returns focus to the scene after a delete that came from the scene', () => {
  for (const context of [DESKTOP_EMPTY, MOBILE_EMPTY]) {
    expect(
      resolveFocusIntent(deleteIntent, keyboard('scene'), context),
    ).toEqual({
      directive: { surface: 'scene' },
      announcement: null,
    })
  }
})

it('lands on the neighbor item in the collection after a desktop toolbar delete, any modality', () => {
  for (const origin of [pointer('item-actions'), keyboard('item-actions')]) {
    expect(resolveFocusIntent(deleteIntent, origin, DESKTOP_EMPTY)).toEqual({
      directive: {
        surface: 'item-collection',
        target: { kind: 'index', index: 2 },
      },
      announcement: null,
    })
  }
})

it('repairs to the scene after a mobile toolbar delete', () => {
  expect(
    resolveFocusIntent(deleteIntent, pointer('item-actions'), MOBILE_EMPTY),
  ).toEqual({
    directive: { surface: 'scene' },
    announcement: null,
  })
})

// --- Undo/redo: reveal within the origin surface, never jump across ---

it('drops history intents from pointer gestures', () => {
  for (const surface of ['chrome', 'scene', 'item-collection'] as const) {
    expect(
      resolveFocusIntent(historyIntent('a'), pointer(surface), DESKTOP),
    ).toEqual({ directive: null, announcement: null })
  }
})

it('drops history intents with unknown modality', () => {
  expect(resolveFocusIntent(historyIntent('a'), NO_ORIGIN, DESKTOP)).toEqual({
    directive: null,
    announcement: null,
  })
})

it('drops keyboard history intents when focus survives in the scene or chrome', () => {
  for (const surface of ['scene', 'chrome'] as const) {
    expect(
      resolveFocusIntent(historyIntent('a'), keyboard(surface), DESKTOP),
    ).toEqual({ directive: null, announcement: null })
  }
})

it('reveals the restored item in the collection for keyboard history from the collection', () => {
  expect(
    resolveFocusIntent(
      historyIntent('a'),
      keyboard('item-collection'),
      DESKTOP,
    ),
  ).toEqual({
    directive: {
      surface: 'item-collection',
      target: { kind: 'item', itemId: 'a' },
    },
    announcement: null,
  })
})

it('falls to the collection container when keyboard history from the collection cleared the selection', () => {
  expect(
    resolveFocusIntent(
      historyIntent(null),
      keyboard('item-collection'),
      DESKTOP_EMPTY,
    ),
  ).toEqual({
    directive: { surface: 'item-collection', target: { kind: 'container' } },
    announcement: null,
  })
})

it('drops a stale mobile collection claim instead of minting an unrealizable directive', () => {
  expect(
    resolveFocusIntent(historyIntent('a'), keyboard('item-collection'), MOBILE),
  ).toEqual({ directive: null, announcement: null })
})

it('drops keyboard history from the panels while they survive the change', () => {
  for (const surface of ['inspector', 'item-actions'] as const) {
    expect(
      resolveFocusIntent(historyIntent('a'), keyboard(surface), DESKTOP),
    ).toEqual({ directive: null, announcement: null })
  }
})

it('repairs panel focus lost to a deselecting keyboard history change', () => {
  for (const surface of ['inspector', 'item-actions'] as const) {
    expect(
      resolveFocusIntent(historyIntent(null), keyboard(surface), DESKTOP_EMPTY),
    ).toEqual({
      directive: { surface: 'item-collection', target: { kind: 'container' } },
      announcement: null,
    })

    expect(
      resolveFocusIntent(historyIntent(null), keyboard(surface), MOBILE_EMPTY),
    ).toEqual({
      directive: { surface: 'scene' },
      announcement: null,
    })
  }
})

it('lands keyboard history from an unknown origin on the desktop collection', () => {
  expect(
    resolveFocusIntent(historyIntent('a'), keyboard('unknown'), DESKTOP),
  ).toEqual({
    directive: {
      surface: 'item-collection',
      target: { kind: 'item', itemId: 'a' },
    },
    announcement: null,
  })

  expect(
    resolveFocusIntent(historyIntent(null), keyboard('unknown'), DESKTOP_EMPTY),
  ).toEqual({
    directive: { surface: 'item-collection', target: { kind: 'container' } },
    announcement: null,
  })
})

it('drops keyboard history from an unknown origin on mobile', () => {
  expect(
    resolveFocusIntent(historyIntent('a'), keyboard('unknown'), MOBILE),
  ).toEqual({ directive: null, announcement: null })
})
