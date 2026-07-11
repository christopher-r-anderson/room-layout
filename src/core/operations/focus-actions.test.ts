// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  focusActions,
  getPendingFocus,
  resetFocusStore,
} from '@/core/stores/focus-store'
import {
  resetSelectionStore,
  selectionActions,
} from '@/core/stores/selection-store'
import { dialogActions, resetDialogStore } from '@/core/stores/dialog-store'
import { feedback } from '@/core/stores/feedback-store'
import { requestFocus, startPendingFocusReconciler } from './focus-actions'

type MediaQueryChangeListener = (event: { matches: boolean }) => void

// jsdom's matchMedia never matches, which reads as the mobile layout. This
// stub makes the layout controllable and captures change listeners so tests
// can flip it.
function stubLayout(initial: 'desktop' | 'mobile') {
  let matches = initial === 'desktop'
  const listeners = new Set<MediaQueryChangeListener>()

  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      get matches() {
        return matches
      },
      media: query,
      addEventListener: (_: string, listener: MediaQueryChangeListener) => {
        listeners.add(listener)
      },
      removeEventListener: (_: string, listener: MediaQueryChangeListener) => {
        listeners.delete(listener)
      },
    })),
  )

  return {
    flipTo(layout: 'desktop' | 'mobile') {
      matches = layout === 'desktop'
      listeners.forEach((listener) => {
        listener({ matches })
      })
    },
  }
}

beforeEach(() => {
  resetFocusStore()
  resetSelectionStore()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('requestFocus', () => {
  it('stores the resolved directive for the surface to realize', () => {
    stubLayout('desktop')

    requestFocus({ kind: 'surface', surface: 'item-collection' })

    expect(getPendingFocus()).toEqual({
      surface: 'item-collection',
      target: { kind: 'auto' },
    })
  })

  it('announces a drop instead of storing a directive', () => {
    stubLayout('mobile')
    const announce = vi.spyOn(feedback, 'interactionUpdate')

    requestFocus({ kind: 'surface', surface: 'item-collection' })

    expect(getPendingFocus()).toBeNull()
    expect(announce).toHaveBeenCalledWith(
      'The furniture list is not available in this layout.',
    )
  })

  it('reads the post-mutation selection for selection-bound intents', () => {
    stubLayout('desktop')
    selectionActions.setSelection('chair-1')

    requestFocus({ kind: 'surface', surface: 'inspector' })

    expect(getPendingFocus()).toEqual({ surface: 'inspector' })
  })

  it('fills the origin surface from the tracked focus claim', () => {
    stubLayout('desktop')
    focusActions.surfaceFocused('item-collection')
    selectionActions.setSelection('chair-1')

    requestFocus(
      { kind: 'selected-item', operation: 'history', targetItemId: 'chair-1' },
      { modality: 'keyboard' },
    )

    expect(getPendingFocus()).toEqual({
      surface: 'item-collection',
      target: { kind: 'item', itemId: 'chair-1' },
    })
  })

  it('treats an untracked focus location as chrome and never steals from it', () => {
    stubLayout('desktop')
    const control = document.createElement('button')
    document.body.appendChild(control)
    control.focus()

    requestFocus(
      { kind: 'selected-item', operation: 'history', targetItemId: 'chair-1' },
      { modality: 'keyboard' },
    )

    expect(getPendingFocus()).toBeNull()
    control.remove()
  })

  it('treats focus lost to the body as repairable', () => {
    stubLayout('desktop')

    requestFocus(
      { kind: 'selected-item', operation: 'history', targetItemId: 'chair-1' },
      { modality: 'keyboard' },
    )

    expect(getPendingFocus()).toEqual({
      surface: 'item-collection',
      target: { kind: 'item', itemId: 'chair-1' },
    })
  })

  it('lets a dropped resolution supersede an unrealized directive', () => {
    stubLayout('desktop')
    requestFocus({ kind: 'surface', surface: 'item-collection' })
    expect(getPendingFocus()).not.toBeNull()

    requestFocus(
      { kind: 'selected-item', operation: 'history', targetItemId: 'chair-1' },
      { modality: 'pointer' },
    )

    expect(getPendingFocus()).toBeNull()
  })

  it('prefers an explicitly declared origin surface over the tracked claim', () => {
    stubLayout('desktop')
    focusActions.surfaceFocused('scene')

    requestFocus(
      { kind: 'selected-item', operation: 'delete', neighborIndex: 1 },
      { surface: 'item-actions' },
    )

    expect(getPendingFocus()).toEqual({
      surface: 'item-collection',
      target: { kind: 'index', index: 1 },
    })
  })
})

describe('startPendingFocusReconciler', () => {
  let layout: ReturnType<typeof stubLayout>
  let stop: () => void

  beforeEach(() => {
    layout = stubLayout('desktop')
    resetDialogStore()
    dialogActions.configureRuntimeContext({
      isDialogsEnabled: () => true,
      getSelectedFurniture: () => null,
      canStartOver: () => true,
    })
    dialogActions.registerDialogDefinitions([
      { id: 'delete', kind: 'blocking' },
      { id: 'room-surface', kind: 'non-blocking' },
    ])
    stop = startPendingFocusReconciler()
  })

  afterEach(() => {
    stop()
    resetDialogStore()
  })

  it('clears a pending directive when a blocking overlay opens', () => {
    requestFocus({ kind: 'surface', surface: 'item-collection' })
    expect(getPendingFocus()).not.toBeNull()

    dialogActions.openDialog('delete')

    expect(getPendingFocus()).toBeNull()
  })

  it('leaves the directive when a non-blocking overlay opens', () => {
    requestFocus({ kind: 'surface', surface: 'item-collection' })

    dialogActions.openDialog('room-surface')

    expect(getPendingFocus()).not.toBeNull()
  })

  it('clears a pending directive when the layout flips', () => {
    requestFocus({ kind: 'surface', surface: 'item-collection' })
    expect(getPendingFocus()).not.toBeNull()

    layout.flipTo('mobile')

    expect(getPendingFocus()).toBeNull()
  })
})
