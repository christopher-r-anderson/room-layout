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
  onUndo: () => void
  onRedo: () => void
  onNewSceneIntent: () => void
  onOpenDeleteDialog: () => void
  onFocusSelected: () => void
  onMoveSelection: (delta: { x: number; z: number }) => void
  onClearSelection: () => void
  onRotate: (direction: -1 | 1) => void
}) {
  useKeyboardShortcuts({
    ...props,
    canStartNewScene: props.canStartNewScene ?? true,
  })

  return <button type="button">Editor Root</button>
}

function DialogEscapeHarness(props: {
  enabled: boolean
  hasSelection: boolean
  preventDefaultOnEscape?: boolean
  onClearSelection: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: props.hasSelection,
    isModalOpen: false,
    canStartNewScene: true,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onNewSceneIntent: vi.fn(),
    onOpenDeleteDialog: vi.fn(),
    onFocusSelected: vi.fn(),
    onMoveSelection: vi.fn(),
    onClearSelection: props.onClearSelection,
    onRotate: vi.fn(),
  })

  useEffect(() => {
    buttonRef.current?.focus()
  }, [])

  return (
    <div
      role="dialog"
      onKeyDown={(event) => {
        if (props.preventDefaultOnEscape && event.key === 'Escape') {
          event.preventDefault()
        }
      }}
    >
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
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  useKeyboardShortcuts({
    enabled: props.enabled,
    hasSelection: false,
    isModalOpen: false,
    canStartNewScene: true,
    onUndo: props.onUndo,
    onRedo: props.onRedo,
    onNewSceneIntent: vi.fn(),
    onOpenDeleteDialog: vi.fn(),
    onFocusSelected: vi.fn(),
    onMoveSelection: vi.fn(),
    onClearSelection: vi.fn(),
    onRotate: vi.fn(),
  })

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return <input ref={inputRef} type="text" aria-label="editor text input" />
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
    await user.keyboard('q')
    await user.keyboard('e')

    expect(onUndo).toHaveBeenCalledTimes(1)
    expect(onRedo).toHaveBeenCalledTimes(1)
    expect(onRotate).toHaveBeenNthCalledWith(1, 1)
    expect(onRotate).toHaveBeenNthCalledWith(2, -1)
    expect(onMoveSelection).not.toHaveBeenCalled()
    expect(onClearSelection).not.toHaveBeenCalled()
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
      <DialogEscapeHarness
        enabled
        hasSelection
        preventDefaultOnEscape
        onClearSelection={onClearSelection}
      />,
    )

    await user.keyboard('{Escape}')

    expect(onClearSelection).not.toHaveBeenCalled()
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

  it('dispatches the new scene shortcut and suppresses the browser default', () => {
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

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'n',
      ctrlKey: true,
    })

    fireEvent(window, event)

    expect(onNewSceneIntent).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('suppresses browser default but does not dispatch new scene when disabled', () => {
    const onNewSceneIntent = vi.fn()

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

    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'n',
      ctrlKey: true,
    })

    fireEvent(window, event)

    expect(onNewSceneIntent).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(true)
  })
})
