// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { EditorCommand } from '@/core/commands/editor-command'
import { focusActions, resetFocusStore } from '@/core/stores/focus-store'
import { useKeyboardShortcuts } from './use-keyboard-shortcuts'

const createDispatchSpy = () => vi.fn<(command: EditorCommand) => void>()
type DispatchSpy = ReturnType<typeof createDispatchSpy>

function dispatchedCommands(dispatch: DispatchSpy): EditorCommand[] {
  return dispatch.mock.calls.map(([command]) => command)
}

function KeyboardShortcutHarness(props: {
  enabled: boolean
  hasSelection: boolean
  isBlockingOverlayOpen: boolean
  canStartOver?: boolean
  dispatch: DispatchSpy
}) {
  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: props.hasSelection,
    isBlockingOverlayOpen: props.isBlockingOverlayOpen,
    canStartOver: props.canStartOver ?? true,
    dispatch: props.dispatch,
  })

  return <button type="button">Editor Root</button>
}

function DialogEscapeHarness(props: {
  enabled: boolean
  hasSelection: boolean
  dispatch: DispatchSpy
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: props.hasSelection,
    isBlockingOverlayOpen: false,
    canStartOver: true,
    dispatch: props.dispatch,
  })

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <div role="dialog">
      <button ref={buttonRef} type="button">
        Dialog action
      </button>
    </div>
  )
}

function TextInputHarness(props: {
  enabled: boolean
  dispatch: DispatchSpy
  isBlockingOverlayOpen?: boolean
  canStartOver?: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: false,
    isBlockingOverlayOpen: props.isBlockingOverlayOpen ?? false,
    canStartOver: props.canStartOver ?? true,
    dispatch: props.dispatch,
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return <input ref={inputRef} type="text" aria-label="editor text input" />
}

function SelectedItemDetailsInputHarness(props: {
  enabled: boolean
  dispatch: DispatchSpy
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: true,
    isBlockingOverlayOpen: false,
    canStartOver: true,
    dispatch: props.dispatch,
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <input
      ref={inputRef}
      type="text"
      aria-label="Distance from left wall (m)"
    />
  )
}

function DialogStartOverHarness(props: {
  enabled: boolean
  isBlockingOverlayOpen: boolean
  canStartOver?: boolean
  includeTextInput?: boolean
  dispatch: DispatchSpy
}) {
  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: false,
    isBlockingOverlayOpen: props.isBlockingOverlayOpen,
    canStartOver: props.canStartOver ?? true,
    dispatch: props.dispatch,
  })

  return (
    <div role="dialog">
      <button type="button">Dialog action</button>
      {props.includeTextInput ? (
        <input type="text" aria-label="dialog text input" />
      ) : null}
    </div>
  )
}

function PreHandledEscapeHarness(props: {
  enabled: boolean
  hasSelection: boolean
  dispatch: DispatchSpy
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: props.hasSelection,
    isBlockingOverlayOpen: false,
    canStartOver: true,
    dispatch: props.dispatch,
  })

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <div
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.preventDefault()
        }
      }}
    >
      <button ref={buttonRef} type="button">
        Pre-handled escape target
      </button>
    </div>
  )
}

function ContentEditableHarness(props: {
  enabled: boolean
  dispatch: DispatchSpy
}) {
  const editableRef = useRef<HTMLDivElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: false,
    isBlockingOverlayOpen: false,
    canStartOver: true,
    dispatch: props.dispatch,
  })

  useEffect(() => {
    editableRef.current?.focus()
  }, [])

  return (
    <div
      ref={editableRef}
      contentEditable
      role="textbox"
      aria-label="content editable"
      suppressContentEditableWarning
    >
      editable
    </div>
  )
}

const startOverShortcutVariants: {
  label: string
  init: Pick<KeyboardEventInit, 'altKey' | 'ctrlKey' | 'metaKey'>
}[] = [
  { label: 'Ctrl+Alt+N', init: { ctrlKey: true, altKey: true } },
  { label: 'Meta+Alt+N', init: { metaKey: true, altKey: true } },
]

function fireStartOverShortcuts(target: Window | HTMLElement): KeyboardEvent[] {
  return startOverShortcutVariants.map((variant) => {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'n',
      ...variant.init,
    })

    fireEvent(target, event)
    return event
  })
}

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    focusActions.surfaceFocused('scene')
  })

  afterEach(() => {
    resetFocusStore()
  })

  it('blocks delete shortcuts when a blocking overlay is open and uses the latest blocking-overlay state on rerender', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    const view = render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{Delete}')
    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'open-delete-dialog', returnFocusTo: 'room-view' },
    ])

    view.rerender(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{Delete}')
    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'open-delete-dialog', returnFocusTo: 'room-view' },
    ])
  })

  it('handles Backspace as a delete shortcut variant when selection exists', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{Backspace}')
    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'open-delete-dialog', returnFocusTo: 'room-view' },
    ])
  })

  it('does not intercept or execute shortcuts when disabled', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled={false}
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'z',
      ctrlKey: true,
    })

    fireEvent(window, event)

    expect(event.defaultPrevented).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches history and rotation shortcuts when enabled and no blocking overlay is open', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    await user.keyboard('{Control>}y{/Control}')
    await user.keyboard(',')
    await user.keyboard('.')

    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'undo' },
      { kind: 'redo' },
      { kind: 'redo' },
      { kind: 'rotate-selection', direction: 1 },
      { kind: 'rotate-selection', direction: -1 },
    ])
  })

  it('dispatches pane-navigation shortcuts even when the room view does not have focus', () => {
    const dispatch = createDispatchSpy()
    focusActions.surfaceBlurred('scene')

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    const focusInspectorEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'I',
      shiftKey: true,
    })
    const focusRoomViewEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'R',
      shiftKey: true,
    })
    const focusOutlinerEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'O',
      shiftKey: true,
    })
    const focusToolbarEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'T',
      shiftKey: true,
    })

    fireEvent(window, focusInspectorEvent)
    fireEvent(window, focusRoomViewEvent)
    fireEvent(window, focusOutlinerEvent)
    fireEvent(window, focusToolbarEvent)

    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'focus-inspector' },
      { kind: 'focus-room-view' },
      { kind: 'focus-outliner' },
      { kind: 'focus-toolbar' },
    ])
    expect(focusInspectorEvent.defaultPrevented).toBe(true)
    expect(focusRoomViewEvent.defaultPrevented).toBe(true)
    expect(focusOutlinerEvent.defaultPrevented).toBe(true)
    expect(focusToolbarEvent.defaultPrevented).toBe(true)
  })

  it('blocks pane-navigation shortcuts when a blocking overlay is open', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen
        dispatch={dispatch}
      />,
    )

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'I',
      shiftKey: true,
    })

    fireEvent(window, event)

    expect(dispatch).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('does not dispatch pane-navigation shortcuts from text inputs or contenteditable targets', () => {
    const dispatch = createDispatchSpy()

    const view = render(<TextInputHarness enabled dispatch={dispatch} />)

    const input = screen.getByRole('textbox', { name: 'editor text input' })
    const inputEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'I',
      shiftKey: true,
    })

    fireEvent(input, inputEvent)

    expect(dispatch).not.toHaveBeenCalled()
    expect(inputEvent.defaultPrevented).toBe(false)

    view.rerender(<ContentEditableHarness enabled dispatch={dispatch} />)

    const contentEditable = screen.getByRole('textbox', {
      name: 'content editable',
    })
    const contentEditableEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'I',
      shiftKey: true,
    })

    fireEvent(contentEditable, contentEditableEvent)

    expect(dispatch).not.toHaveBeenCalled()
    expect(contentEditableEvent.defaultPrevented).toBe(false)
  })

  it('dispatches undo/redo for Meta-based shortcuts', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    const undoEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'z',
      metaKey: true,
    })

    const redoEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'z',
      metaKey: true,
      shiftKey: true,
    })

    fireEvent(window, undoEvent)
    fireEvent(window, redoEvent)

    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'undo' },
      { kind: 'redo' },
    ])
    expect(undoEvent.defaultPrevented).toBe(true)
    expect(redoEvent.defaultPrevented).toBe(true)
  })

  it('does not dispatch undo/redo when a blocking overlay is open', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    await user.keyboard('{Control>}y{/Control}')

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches arrow movement and escape clear when selection exists', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    await user.keyboard('{Escape}')

    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'move-selection', delta: { x: 0.5, z: 0 } },
      { kind: 'move-selection', delta: { x: 0, z: -1 } },
      { kind: 'move-selection', delta: { x: 0, z: 0.1 } },
      { kind: 'clear-selection' },
    ])
  })

  it('dispatches focusSelected on F when selection exists and no blocking-overlay or input context', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('f')
    expect(dispatchedCommands(dispatch)).toEqual([{ kind: 'focus-selected' }])
  })

  it('dispatches camera preset shortcuts on 1/2/3/4 when enabled and no blocking-overlay or input context', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('1234')

    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'set-camera-preset', preset: 'corner' },
      { kind: 'set-camera-preset', preset: 'front' },
      { kind: 'set-camera-preset', preset: 'side' },
      { kind: 'set-camera-preset', preset: 'top' },
    ])
  })

  it('dispatches camera preset shortcuts for shifted number-row digit codes on common alternate layouts', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    fireEvent(
      window,
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '&',
        code: 'Digit1',
        shiftKey: true,
      }),
    )
    fireEvent(
      window,
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '@',
        code: 'Digit2',
        shiftKey: true,
      }),
    )
    fireEvent(
      window,
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '"',
        code: 'Digit3',
        shiftKey: true,
      }),
    )
    fireEvent(
      window,
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: "'",
        code: 'Digit4',
        shiftKey: true,
      }),
    )

    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'set-camera-preset', preset: 'corner' },
      { kind: 'set-camera-preset', preset: 'front' },
      { kind: 'set-camera-preset', preset: 'side' },
      { kind: 'set-camera-preset', preset: 'top' },
    ])
  })

  it('does not dispatch camera preset shortcuts for unshifted alternate-layout number-row symbols', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    fireEvent(
      window,
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '&',
        code: 'Digit1',
      }),
    )
    fireEvent(
      window,
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'é',
        code: 'Digit2',
      }),
    )
    fireEvent(
      window,
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: '"',
        code: 'Digit3',
      }),
    )
    fireEvent(
      window,
      new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: "'",
        code: 'Digit4',
      }),
    )

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does not dispatch camera preset shortcuts when a blocking overlay is open', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen
        dispatch={dispatch}
      />,
    )

    await user.keyboard('1234')

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does not dispatch focusSelected on F when no selection', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('f')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does not dispatch focusSelected on F when a blocking overlay is open', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen
        dispatch={dispatch}
      />,
    )

    await user.keyboard('f')
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does not clear selection when Escape originates inside dialog content', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(<DialogEscapeHarness enabled hasSelection dispatch={dispatch} />)

    await user.keyboard('{Escape}')

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does not clear selection when Escape was already handled', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(<PreHandledEscapeHarness enabled hasSelection dispatch={dispatch} />)

    await user.keyboard('{Escape}')

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does not clear selection when room view is not focused', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()
    focusActions.surfaceBlurred('scene')

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{Escape}')

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches clear-selection on Escape even when there is no selection (for preview clearing)', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{Escape}')

    expect(dispatchedCommands(dispatch)).toEqual([{ kind: 'clear-selection' }])
  })

  it('does not intercept undo/redo in text inputs', () => {
    const dispatch = createDispatchSpy()

    const view = render(<TextInputHarness enabled dispatch={dispatch} />)

    const input = view.getByRole('textbox', { name: 'editor text input' })

    const undoEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'z',
      ctrlKey: true,
    })
    const undoNotCanceled = input.dispatchEvent(undoEvent)

    const redoEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'z',
      ctrlKey: true,
      shiftKey: true,
    })
    const redoNotCanceled = input.dispatchEvent(redoEvent)

    expect(undoNotCanceled).toBe(true)
    expect(redoNotCanceled).toBe(true)
    expect(undoEvent.defaultPrevented).toBe(false)
    expect(redoEvent.defaultPrevented).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does not dispatch camera preset shortcuts in text inputs', () => {
    const dispatch = createDispatchSpy()

    const view = render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    const input = document.createElement('input')
    input.type = 'text'
    input.setAttribute('aria-label', 'preset input')
    view.container.appendChild(input)
    input.focus()

    const presetEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: '1',
    })
    const presetNotCanceled = input.dispatchEvent(presetEvent)

    expect(presetNotCanceled).toBe(true)
    expect(presetEvent.defaultPrevented).toBe(false)
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('dispatches start over and prevents default for Ctrl+Alt+N and Meta+Alt+N', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        canStartOver
        dispatch={dispatch}
      />,
    )

    const events = fireStartOverShortcuts(window)

    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'start-over' },
      { kind: 'start-over' },
    ])
    for (const event of events) {
      expect(event.defaultPrevented).toBe(true)
    }
  })

  it.each<{
    name: string
    renderCase: (dispatch: DispatchSpy) => Window | HTMLElement
  }>([
    {
      name: 'start over is disabled',
      renderCase: (dispatch) => {
        render(
          <KeyboardShortcutHarness
            enabled
            hasSelection={false}
            isBlockingOverlayOpen={false}
            canStartOver={false}
            dispatch={dispatch}
          />,
        )

        return window
      },
    },
    {
      name: 'a blocking overlay is open',
      renderCase: (dispatch) => {
        render(
          <KeyboardShortcutHarness
            enabled
            hasSelection={false}
            isBlockingOverlayOpen
            canStartOver
            dispatch={dispatch}
          />,
        )

        return window
      },
    },
    {
      name: 'the target is inside dialog content',
      renderCase: (dispatch) => {
        const view = render(
          <DialogStartOverHarness
            enabled
            isBlockingOverlayOpen
            canStartOver
            dispatch={dispatch}
          />,
        )

        return view.getByRole('button', { name: 'Dialog action' })
      },
    },
    {
      name: 'the target is a dialog text input',
      renderCase: (dispatch) => {
        const view = render(
          <DialogStartOverHarness
            enabled
            isBlockingOverlayOpen
            canStartOver
            includeTextInput
            dispatch={dispatch}
          />,
        )

        return view.getByRole('textbox', { name: 'dialog text input' })
      },
    },
    {
      name: 'the target is a regular text input',
      renderCase: (dispatch) => {
        const view = render(<TextInputHarness enabled dispatch={dispatch} />)

        return view.getByRole('textbox', { name: 'editor text input' })
      },
    },
    {
      name: 'the target is contenteditable',
      renderCase: (dispatch) => {
        const view = render(
          <ContentEditableHarness enabled dispatch={dispatch} />,
        )

        return view.getByRole('textbox', { name: 'content editable' })
      },
    },
  ])(
    'does not dispatch start over or prevent default when $name',
    ({ renderCase }) => {
      const dispatch = createDispatchSpy()
      const target = renderCase(dispatch)
      const events = fireStartOverShortcuts(target)

      expect(dispatch).not.toHaveBeenCalled()
      for (const event of events) {
        expect(event.defaultPrevented).toBe(false)
      }
    },
  )

  it('does not prevent default or intercept browser zoom keys (Ctrl+Plus/Minus, Cmd+Plus/Minus)', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    const browserZoomCombos: {
      init: Pick<KeyboardEventInit, 'ctrlKey' | 'metaKey'>
      key: string
    }[] = [
      { init: { ctrlKey: true }, key: '+' },
      { init: { ctrlKey: true }, key: '-' },
      { init: { metaKey: true }, key: '+' },
      { init: { metaKey: true }, key: '-' },
    ]

    for (const { init, key } of browserZoomCombos) {
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key,
        ...init,
      })

      fireEvent(window, event)

      expect(event.defaultPrevented).toBe(false)
    }

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('suppresses always-on-match shortcuts (Ctrl+Z) even when execute condition fails (blocking overlay open)', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen
        dispatch={dispatch}
      />,
    )

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'z',
      ctrlKey: true,
    })

    fireEvent(window, event)

    // Should prevent default even though a blocking overlay is open (always-on-match behavior)
    expect(event.defaultPrevented).toBe(true)
    // Should NOT execute the action because the blocking overlay gate blocks execution
    expect(dispatch).not.toHaveBeenCalled()
  })

  it('suppresses on-execute shortcuts only when action executes', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    // When selection exists and can execute: should prevent default
    const moveEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowUp',
    })

    fireEvent(window, moveEvent)

    expect(moveEvent.defaultPrevented).toBe(true)
    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'move-selection', delta: { x: 0, z: -0.5 } },
    ])
  })

  it('falls through to canvas-browse shortcut when move shortcut cannot execute (no selection)', () => {
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    // When no selection: move-up cannot execute, falls through to canvas-browse-prev
    const upEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowUp',
    })

    fireEvent(window, upEvent)

    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'canvas-browse', direction: 'prev' },
    ])
    // canvas-browse-prev suppresses the default action
    expect(upEvent.defaultPrevented).toBe(true)
  })

  it('dispatches canvas-browse shortcuts when room view has focus and no selection', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowLeft}')
    await user.keyboard('{ArrowUp}')
    await user.keyboard('{Home}')
    await user.keyboard('{End}')
    await user.keyboard('{Enter}')

    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'canvas-browse', direction: 'next' },
      { kind: 'canvas-browse', direction: 'next' },
      { kind: 'canvas-browse', direction: 'prev' },
      { kind: 'canvas-browse', direction: 'prev' },
      { kind: 'canvas-browse', direction: 'first' },
      { kind: 'canvas-browse', direction: 'last' },
      { kind: 'canvas-select-previewed' },
    ])
  })

  it('does not dispatch canvas-browse shortcuts when room view lacks focus', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()
    focusActions.surfaceBlurred('scene')

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{ArrowRight}{ArrowLeft}{Home}{End}{Enter}')

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('does not dispatch canvas-browse shortcuts when selection exists', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{ArrowRight}{ArrowLeft}')

    // Arrow keys should go to move-selection (has selection), not canvas-browse.
    expect(dispatchedCommands(dispatch)).toEqual([
      { kind: 'move-selection', delta: { x: 0.5, z: 0 } },
      { kind: 'move-selection', delta: { x: -0.5, z: 0 } },
    ])
  })

  it('keeps room-view scoped shortcuts inactive until the room view has focus', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()
    focusActions.surfaceBlurred('scene')

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isBlockingOverlayOpen={false}
        dispatch={dispatch}
      />,
    )

    await user.keyboard('{Delete}{Backspace}f,.')
    await user.keyboard('1234')
    await user.keyboard('{ArrowUp}{ArrowDown}{ArrowLeft}{ArrowRight}')
    await user.keyboard('{Home}{End}{Enter}')

    expect(dispatch).not.toHaveBeenCalled()
  })

  it('suppresses room-view shortcuts while focus is inside selected item detail inputs', async () => {
    const user = userEvent.setup()
    const dispatch = createDispatchSpy()

    render(<SelectedItemDetailsInputHarness enabled dispatch={dispatch} />)

    await user.keyboard('{Delete}{Backspace},.')
    await user.keyboard('{ArrowUp}{ArrowDown}{ArrowLeft}{ArrowRight}')

    expect(dispatch).not.toHaveBeenCalled()
  })
})
