// @vitest-environment jsdom

import { fireEvent, render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useKeyboardShortcuts } from './use-keyboard-shortcuts'

function KeyboardShortcutHarness(props: {
  enabled: boolean
  hasSelection: boolean
  isModalOpen: boolean
  canStartNewScene?: boolean
  roomViewHasFocus?: boolean
  onUndo: () => void
  onRedo: () => void
  onNewSceneIntent: () => void
  onOpenDeleteDialog: () => void
  onFocusSelected: () => void
  onMoveSelection: (delta: { x: number; z: number }) => void
  onClearSelection: () => void
  onRotate: (direction: -1 | 1) => void
  onSetCameraPreset?: (preset: 'corner' | 'front' | 'side' | 'top') => void
  onCanvasBrowse?: (direction: 'next' | 'prev' | 'first' | 'last') => void
  onCanvasSelectPreviewed?: () => void
}) {
  useKeyboardShortcuts({
    ...props,
    canStartNewScene: props.canStartNewScene ?? true,
    roomViewHasFocus: props.roomViewHasFocus ?? true,
    onSetCameraPreset: props.onSetCameraPreset ?? vi.fn(),
    onCanvasBrowse: props.onCanvasBrowse ?? vi.fn(),
    onCanvasSelectPreviewed: props.onCanvasSelectPreviewed ?? vi.fn(),
  })

  return <button type="button">Editor Root</button>
}

function DialogEscapeHarness(props: {
  enabled: boolean
  hasSelection: boolean
  onClearSelection: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: props.hasSelection,
    isModalOpen: false,
    canStartNewScene: true,
    roomViewHasFocus: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onNewSceneIntent: vi.fn(),
    onOpenDeleteDialog: vi.fn(),
    onFocusSelected: vi.fn(),
    onMoveSelection: vi.fn(),
    onClearSelection: props.onClearSelection,
    onRotate: vi.fn(),
    onSetCameraPreset: vi.fn(),
    onCanvasBrowse: vi.fn(),
    onCanvasSelectPreviewed: vi.fn(),
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
  onUndo: () => void
  onRedo: () => void
  onNewSceneIntent?: () => void
  isModalOpen?: boolean
  canStartNewScene?: boolean
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: false,
    isModalOpen: props.isModalOpen ?? false,
    canStartNewScene: props.canStartNewScene ?? true,
    roomViewHasFocus: true,
    onUndo: props.onUndo,
    onRedo: props.onRedo,
    onNewSceneIntent: props.onNewSceneIntent ?? vi.fn(),
    onOpenDeleteDialog: vi.fn(),
    onFocusSelected: vi.fn(),
    onMoveSelection: vi.fn(),
    onClearSelection: vi.fn(),
    onRotate: vi.fn(),
    onSetCameraPreset: vi.fn(),
    onCanvasBrowse: vi.fn(),
    onCanvasSelectPreviewed: vi.fn(),
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return <input ref={inputRef} type="text" aria-label="editor text input" />
}

function DialogNewSceneHarness(props: {
  enabled: boolean
  isModalOpen: boolean
  canStartNewScene?: boolean
  includeTextInput?: boolean
  onNewSceneIntent: () => void
}) {
  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: false,
    isModalOpen: props.isModalOpen,
    canStartNewScene: props.canStartNewScene ?? true,
    roomViewHasFocus: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onNewSceneIntent: props.onNewSceneIntent,
    onOpenDeleteDialog: vi.fn(),
    onFocusSelected: vi.fn(),
    onMoveSelection: vi.fn(),
    onClearSelection: vi.fn(),
    onRotate: vi.fn(),
    onSetCameraPreset: vi.fn(),
    onCanvasBrowse: vi.fn(),
    onCanvasSelectPreviewed: vi.fn(),
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
  onClearSelection: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: props.hasSelection,
    isModalOpen: false,
    canStartNewScene: true,
    roomViewHasFocus: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onNewSceneIntent: vi.fn(),
    onOpenDeleteDialog: vi.fn(),
    onFocusSelected: vi.fn(),
    onMoveSelection: vi.fn(),
    onClearSelection: props.onClearSelection,
    onRotate: vi.fn(),
    onSetCameraPreset: vi.fn(),
    onCanvasBrowse: vi.fn(),
    onCanvasSelectPreviewed: vi.fn(),
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
  onNewSceneIntent: () => void
}) {
  const editableRef = useRef<HTMLDivElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: false,
    isModalOpen: false,
    canStartNewScene: true,
    roomViewHasFocus: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onNewSceneIntent: props.onNewSceneIntent,
    onOpenDeleteDialog: vi.fn(),
    onFocusSelected: vi.fn(),
    onMoveSelection: vi.fn(),
    onClearSelection: vi.fn(),
    onRotate: vi.fn(),
    onSetCameraPreset: vi.fn(),
    onCanvasBrowse: vi.fn(),
    onCanvasSelectPreviewed: vi.fn(),
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

const newSceneShortcutVariants: {
  label: string
  init: Pick<KeyboardEventInit, 'ctrlKey' | 'metaKey'>
}[] = [
  { label: 'Ctrl+N', init: { ctrlKey: true } },
  { label: 'Meta+N', init: { metaKey: true } },
]

function fireNewSceneShortcuts(target: Window | HTMLElement): KeyboardEvent[] {
  return newSceneShortcutVariants.map((variant) => {
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
  it('blocks delete shortcuts when a modal is open and uses the latest modal state on rerender', async () => {
    const user = userEvent.setup()
    const onOpenDeleteDialog = vi.fn()

    const view = render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('{Delete}')
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)

    view.rerender(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('{Delete}')
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
  })

  it('handles Backspace as a delete shortcut variant when selection exists', async () => {
    const user = userEvent.setup()
    const onOpenDeleteDialog = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('{Backspace}')
    expect(onOpenDeleteDialog).toHaveBeenCalledTimes(1)
  })

  it('does not intercept or execute shortcuts when disabled', () => {
    const onUndo = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled={false}
        hasSelection
        isModalOpen={false}
        onUndo={onUndo}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
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
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('dispatches history and rotation shortcuts when enabled and no modal is open', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    const onRedo = vi.fn()
    const onRotate = vi.fn()
    const onMoveSelection = vi.fn()
    const onClearSelection = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        onUndo={onUndo}
        onRedo={onRedo}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={onMoveSelection}
        onClearSelection={onClearSelection}
        onRotate={onRotate}
      />,
    )

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    await user.keyboard('{Control>}y{/Control}')
    await user.keyboard(',')
    await user.keyboard('.')

    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(2)
    expect(onRotate).toHaveBeenNthCalledWith(1, 1)
    expect(onRotate).toHaveBeenNthCalledWith(2, -1)
    expect(onMoveSelection).not.toHaveBeenCalled()
    expect(onClearSelection).not.toHaveBeenCalled()
  })

  it('dispatches undo/redo for Meta-based shortcuts', () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        onUndo={onUndo}
        onRedo={onRedo}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
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

    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
    expect(undoEvent.defaultPrevented).toBe(true)
    expect(redoEvent.defaultPrevented).toBe(true)
  })

  it('does not dispatch undo/redo when modal is open', async () => {
    const user = userEvent.setup()
    const onUndo = vi.fn()
    const onRedo = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen
        onUndo={onUndo}
        onRedo={onRedo}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('{Control>}z{/Control}')
    await user.keyboard('{Control>}{Shift>}z{/Shift}{/Control}')
    await user.keyboard('{Control>}y{/Control}')

    expect(onUndo).not.toHaveBeenCalled()
    expect(onRedo).not.toHaveBeenCalled()
  })

  it('dispatches arrow movement and escape clear when selection exists', async () => {
    const user = userEvent.setup()
    const onMoveSelection = vi.fn()
    const onClearSelection = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={onMoveSelection}
        onClearSelection={onClearSelection}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{Shift>}{ArrowUp}{/Shift}')
    await user.keyboard('{Alt>}{ArrowDown}{/Alt}')
    await user.keyboard('{Escape}')

    expect(onMoveSelection).toHaveBeenNthCalledWith(1, { x: 0.5, z: 0 })
    expect(onMoveSelection).toHaveBeenNthCalledWith(2, { x: 0, z: -1 })
    expect(onMoveSelection).toHaveBeenNthCalledWith(3, { x: 0, z: 0.1 })
    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  it('dispatches focusSelected on F when selection exists and no modal/input context', async () => {
    const user = userEvent.setup()
    const onFocusSelected = vi.fn()
    const onMoveSelection = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={onFocusSelected}
        onMoveSelection={onMoveSelection}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('f')
    expect(onFocusSelected).toHaveBeenCalledTimes(1)
    expect(onMoveSelection).not.toHaveBeenCalled()
  })

  it('dispatches camera preset shortcuts on 1/2/3/4 when enabled and no modal/input context', async () => {
    const user = userEvent.setup()
    const onSetCameraPreset = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onSetCameraPreset={onSetCameraPreset}
      />,
    )

    await user.keyboard('1234')

    expect(onSetCameraPreset).toHaveBeenNthCalledWith(1, 'corner')
    expect(onSetCameraPreset).toHaveBeenNthCalledWith(2, 'front')
    expect(onSetCameraPreset).toHaveBeenNthCalledWith(3, 'side')
    expect(onSetCameraPreset).toHaveBeenNthCalledWith(4, 'top')
  })

  it('dispatches camera preset shortcuts for shifted number-row digit codes on common alternate layouts', () => {
    const onSetCameraPreset = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onSetCameraPreset={onSetCameraPreset}
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

    expect(onSetCameraPreset).toHaveBeenNthCalledWith(1, 'corner')
    expect(onSetCameraPreset).toHaveBeenNthCalledWith(2, 'front')
    expect(onSetCameraPreset).toHaveBeenNthCalledWith(3, 'side')
    expect(onSetCameraPreset).toHaveBeenNthCalledWith(4, 'top')
  })

  it('does not dispatch camera preset shortcuts for unshifted alternate-layout number-row symbols', () => {
    const onSetCameraPreset = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onSetCameraPreset={onSetCameraPreset}
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

    expect(onSetCameraPreset).not.toHaveBeenCalled()
  })

  it('does not dispatch camera preset shortcuts when modal is open', async () => {
    const user = userEvent.setup()
    const onSetCameraPreset = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onSetCameraPreset={onSetCameraPreset}
      />,
    )

    await user.keyboard('1234')

    expect(onSetCameraPreset).not.toHaveBeenCalled()
  })

  it('does not dispatch focusSelected on F when no selection', async () => {
    const user = userEvent.setup()
    const onFocusSelected = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={onFocusSelected}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('f')
    expect(onFocusSelected).not.toHaveBeenCalled()
  })

  it('does not dispatch focusSelected on F when modal is open', async () => {
    const user = userEvent.setup()
    const onFocusSelected = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={onFocusSelected}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('f')
    expect(onFocusSelected).not.toHaveBeenCalled()
  })

  it('does not clear selection when Escape originates inside dialog content', async () => {
    const user = userEvent.setup()
    const onClearSelection = vi.fn()

    render(
      <DialogEscapeHarness
        enabled
        hasSelection
        onClearSelection={onClearSelection}
      />,
    )

    await user.keyboard('{Escape}')

    expect(onClearSelection).not.toHaveBeenCalled()
  })

  it('does not clear selection when Escape was already handled', async () => {
    const user = userEvent.setup()
    const onClearSelection = vi.fn()

    render(
      <PreHandledEscapeHarness
        enabled
        hasSelection
        onClearSelection={onClearSelection}
      />,
    )

    await user.keyboard('{Escape}')

    expect(onClearSelection).not.toHaveBeenCalled()
  })

  it('does not clear selection when room view is not focused', async () => {
    const user = userEvent.setup()
    const onClearSelection = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        roomViewHasFocus={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={onClearSelection}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('{Escape}')

    expect(onClearSelection).not.toHaveBeenCalled()
  })

  it('dispatches clear-selection on Escape even when there is no selection (for preview clearing)', async () => {
    const user = userEvent.setup()
    const onClearSelection = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        roomViewHasFocus={true}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={onClearSelection}
        onRotate={vi.fn()}
      />,
    )

    await user.keyboard('{Escape}')

    expect(onClearSelection).toHaveBeenCalledTimes(1)
  })

  it('does not intercept undo/redo in text inputs', () => {
    const onUndo = vi.fn()
    const onRedo = vi.fn()

    const view = render(
      <TextInputHarness enabled onUndo={onUndo} onRedo={onRedo} />,
    )

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
    expect(onUndo).not.toHaveBeenCalled()
    expect(onRedo).not.toHaveBeenCalled()
  })

  it('does not dispatch camera preset shortcuts in text inputs', () => {
    const onSetCameraPreset = vi.fn()

    const view = render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onSetCameraPreset={onSetCameraPreset}
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
    expect(onSetCameraPreset).not.toHaveBeenCalled()
  })

  it('dispatches new scene and suppresses browser default for Ctrl+N and Meta+N', () => {
    const onNewSceneIntent = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        canStartNewScene
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={onNewSceneIntent}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
      />,
    )

    const events = fireNewSceneShortcuts(window)

    expect(onNewSceneIntent).toHaveBeenCalledTimes(2)
    for (const event of events) {
      expect(event.defaultPrevented).toBe(true)
    }
  })

  it.each<{
    name: string
    renderCase: (onNewSceneIntent: () => void) => Window | HTMLElement
  }>([
    {
      name: 'new scene start is disabled',
      renderCase: (onNewSceneIntent) => {
        render(
          <KeyboardShortcutHarness
            enabled
            hasSelection={false}
            isModalOpen={false}
            canStartNewScene={false}
            onUndo={vi.fn()}
            onRedo={vi.fn()}
            onNewSceneIntent={onNewSceneIntent}
            onOpenDeleteDialog={vi.fn()}
            onFocusSelected={vi.fn()}
            onMoveSelection={vi.fn()}
            onClearSelection={vi.fn()}
            onRotate={vi.fn()}
          />,
        )

        return window
      },
    },
    {
      name: 'a modal is open',
      renderCase: (onNewSceneIntent) => {
        render(
          <KeyboardShortcutHarness
            enabled
            hasSelection={false}
            isModalOpen
            canStartNewScene
            onUndo={vi.fn()}
            onRedo={vi.fn()}
            onNewSceneIntent={onNewSceneIntent}
            onOpenDeleteDialog={vi.fn()}
            onFocusSelected={vi.fn()}
            onMoveSelection={vi.fn()}
            onClearSelection={vi.fn()}
            onRotate={vi.fn()}
          />,
        )

        return window
      },
    },
    {
      name: 'the target is inside dialog content',
      renderCase: (onNewSceneIntent) => {
        const view = render(
          <DialogNewSceneHarness
            enabled
            isModalOpen
            canStartNewScene
            onNewSceneIntent={onNewSceneIntent}
          />,
        )

        return view.getByRole('button', { name: 'Dialog action' })
      },
    },
    {
      name: 'the target is a dialog text input',
      renderCase: (onNewSceneIntent) => {
        const view = render(
          <DialogNewSceneHarness
            enabled
            isModalOpen
            canStartNewScene
            includeTextInput
            onNewSceneIntent={onNewSceneIntent}
          />,
        )

        return view.getByRole('textbox', { name: 'dialog text input' })
      },
    },
    {
      name: 'the target is a regular text input',
      renderCase: (onNewSceneIntent) => {
        const view = render(
          <TextInputHarness
            enabled
            onUndo={vi.fn()}
            onRedo={vi.fn()}
            onNewSceneIntent={onNewSceneIntent}
          />,
        )

        return view.getByRole('textbox', { name: 'editor text input' })
      },
    },
    {
      name: 'the target is contenteditable',
      renderCase: (onNewSceneIntent) => {
        const view = render(
          <ContentEditableHarness
            enabled
            onNewSceneIntent={onNewSceneIntent}
          />,
        )

        return view.getByRole('textbox', { name: 'content editable' })
      },
    },
  ])(
    'suppresses browser default for new scene and does not dispatch when $name',
    ({ renderCase }) => {
      const onNewSceneIntent = vi.fn()
      const target = renderCase(onNewSceneIntent)
      const events = fireNewSceneShortcuts(target)

      expect(onNewSceneIntent).not.toHaveBeenCalled()
      for (const event of events) {
        expect(event.defaultPrevented).toBe(true)
      }
    },
  )

  it('does not prevent default or intercept browser zoom keys (Ctrl+Plus/Minus, Cmd+Plus/Minus)', () => {
    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onSetCameraPreset={vi.fn()}
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
  })

  it('suppresses always-on-match shortcuts (Ctrl+Z) even when execute condition fails (modal open)', () => {
    const onUndo = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen
        onUndo={onUndo}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
      />,
    )

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'z',
      ctrlKey: true,
    })

    fireEvent(window, event)

    // Should prevent default even though modal is open (always-on-match behavior)
    expect(event.defaultPrevented).toBe(true)
    // Should NOT execute the action because modal blocks execution
    expect(onUndo).not.toHaveBeenCalled()
  })

  it('suppresses on-execute shortcuts only when action executes', () => {
    const onMoveSelection = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={onMoveSelection}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
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
    expect(onMoveSelection).toHaveBeenCalled()
  })

  it('falls through to canvas-browse shortcut when move shortcut cannot execute (no selection)', () => {
    const onMoveSelection = vi.fn()
    const onCanvasBrowse = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={onMoveSelection}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onCanvasBrowse={onCanvasBrowse}
      />,
    )

    // When no selection: move-up cannot execute, falls through to canvas-browse-prev
    const upEvent = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'ArrowUp',
    })

    fireEvent(window, upEvent)

    expect(onMoveSelection).not.toHaveBeenCalled()
    expect(onCanvasBrowse).toHaveBeenCalledWith('prev')
    // canvas-browse-prev suppresses the default action
    expect(upEvent.defaultPrevented).toBe(true)
  })

  it('dispatches canvas-browse shortcuts when room view has focus and no selection', async () => {
    const user = userEvent.setup()
    const onCanvasBrowse = vi.fn()
    const onCanvasSelectPreviewed = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        roomViewHasFocus
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onCanvasBrowse={onCanvasBrowse}
        onCanvasSelectPreviewed={onCanvasSelectPreviewed}
      />,
    )

    await user.keyboard('{ArrowRight}')
    await user.keyboard('{ArrowDown}')
    await user.keyboard('{ArrowLeft}')
    await user.keyboard('{ArrowUp}')
    await user.keyboard('{Home}')
    await user.keyboard('{End}')
    await user.keyboard('{Enter}')

    expect(onCanvasBrowse).toHaveBeenNthCalledWith(1, 'next')
    expect(onCanvasBrowse).toHaveBeenNthCalledWith(2, 'next')
    expect(onCanvasBrowse).toHaveBeenNthCalledWith(3, 'prev')
    expect(onCanvasBrowse).toHaveBeenNthCalledWith(4, 'prev')
    expect(onCanvasBrowse).toHaveBeenNthCalledWith(5, 'first')
    expect(onCanvasBrowse).toHaveBeenNthCalledWith(6, 'last')
    expect(onCanvasSelectPreviewed).toHaveBeenCalledTimes(1)
  })

  it('does not dispatch canvas-browse shortcuts when room view lacks focus', async () => {
    const user = userEvent.setup()
    const onCanvasBrowse = vi.fn()
    const onCanvasSelectPreviewed = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection={false}
        isModalOpen={false}
        roomViewHasFocus={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={vi.fn()}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onCanvasBrowse={onCanvasBrowse}
        onCanvasSelectPreviewed={onCanvasSelectPreviewed}
      />,
    )

    await user.keyboard('{ArrowRight}{ArrowLeft}{Home}{End}{Enter}')

    expect(onCanvasBrowse).not.toHaveBeenCalled()
    expect(onCanvasSelectPreviewed).not.toHaveBeenCalled()
  })

  it('does not dispatch canvas-browse shortcuts when selection exists', async () => {
    const user = userEvent.setup()
    const onCanvasBrowse = vi.fn()
    const onMoveSelection = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        roomViewHasFocus
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
        onFocusSelected={vi.fn()}
        onMoveSelection={onMoveSelection}
        onClearSelection={vi.fn()}
        onRotate={vi.fn()}
        onCanvasBrowse={onCanvasBrowse}
      />,
    )

    await user.keyboard('{ArrowRight}{ArrowLeft}')

    // Arrow keys should go to move-selection (has selection), not canvas-browse
    expect(onMoveSelection).toHaveBeenCalled()
    expect(onCanvasBrowse).not.toHaveBeenCalled()
  })

  it('keeps room-view scoped shortcuts inactive until the room view has focus', async () => {
    const user = userEvent.setup()
    const onOpenDeleteDialog = vi.fn()
    const onMoveSelection = vi.fn()
    const onRotate = vi.fn()
    const onFocusSelected = vi.fn()
    const onSetCameraPreset = vi.fn()
    const onCanvasBrowse = vi.fn()
    const onCanvasSelectPreviewed = vi.fn()

    render(
      <KeyboardShortcutHarness
        enabled
        hasSelection
        isModalOpen={false}
        roomViewHasFocus={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onNewSceneIntent={vi.fn()}
        onOpenDeleteDialog={onOpenDeleteDialog}
        onFocusSelected={onFocusSelected}
        onMoveSelection={onMoveSelection}
        onClearSelection={vi.fn()}
        onRotate={onRotate}
        onSetCameraPreset={onSetCameraPreset}
        onCanvasBrowse={onCanvasBrowse}
        onCanvasSelectPreviewed={onCanvasSelectPreviewed}
      />,
    )

    await user.keyboard('{Delete}{Backspace}f,.')
    await user.keyboard('1234')
    await user.keyboard('{ArrowUp}{ArrowDown}{ArrowLeft}{ArrowRight}')
    await user.keyboard('{Home}{End}{Enter}')

    expect(onOpenDeleteDialog).not.toHaveBeenCalled()
    expect(onFocusSelected).not.toHaveBeenCalled()
    expect(onRotate).not.toHaveBeenCalled()
    expect(onSetCameraPreset).not.toHaveBeenCalled()
    expect(onMoveSelection).not.toHaveBeenCalled()
    expect(onCanvasBrowse).not.toHaveBeenCalled()
    expect(onCanvasSelectPreviewed).not.toHaveBeenCalled()
  })
})
