// @vitest-environment jsdom

import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect, useRef } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { useEditorKeyboardShortcuts } from './use-editor-keyboard-shortcuts'

function KeyboardShortcutHarness(props: {
  enabled: boolean
  canUndo: boolean
  canRedo: boolean
  hasSelection: boolean
  isModalOpen: boolean
  onUndo: () => void
  onRedo: () => void
  onOpenDeleteDialog: () => void
  onMoveSelection: (delta: { x: number; z: number }) => void
  onClearSelection: () => void
  onRotate: (direction: -1 | 1) => void
}) {
  useEditorKeyboardShortcuts(props)

  return <button type="button">Editor Root</button>
}

function DialogEscapeHarness(props: {
  enabled: boolean
  hasSelection: boolean
  preventDefaultOnEscape?: boolean
  onClearSelection: () => void
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null)

  useEditorKeyboardShortcuts({
    enabled: props.enabled,
    canUndo: false,
    canRedo: false,
    hasSelection: props.hasSelection,
    isModalOpen: false,
    onUndo: vi.fn(),
    onRedo: vi.fn(),
    onOpenDeleteDialog: vi.fn(),
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

describe('useEditorKeyboardShortcuts', () => {
  it('blocks delete shortcuts when a modal is open and uses the latest modal state on rerender', async () => {
    const user = userEvent.setup()
    const onOpenDeleteDialog = vi.fn()

    const view = render(
      <KeyboardShortcutHarness
        enabled
        canUndo={false}
        canRedo={false}
        hasSelection
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onOpenDeleteDialog={onOpenDeleteDialog}
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
        canUndo={false}
        canRedo={false}
        hasSelection
        isModalOpen
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onOpenDeleteDialog={onOpenDeleteDialog}
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
        canUndo
        canRedo
        hasSelection
        isModalOpen={false}
        onUndo={onUndo}
        onRedo={onRedo}
        onOpenDeleteDialog={vi.fn()}
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
        canUndo={false}
        canRedo={false}
        hasSelection
        isModalOpen={false}
        onUndo={vi.fn()}
        onRedo={vi.fn()}
        onOpenDeleteDialog={vi.fn()}
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
})
