// @vitest-environment jsdom

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SceneReadModel } from '@/scene/scene.types'
import { Outliner } from './outliner'
import { loadBooleanPreference, saveBooleanPreference } from '@/lib/ui/storage'

const OUTLINER_EXPANDED_PREFERENCE_KEY = 'outliner-expanded'

const READ_MODEL: SceneReadModel = {
  selectedId: 'item-1',
  items: [
    {
      id: 'item-1',
      catalogId: 'couch-1',
      name: 'Leather Couch',
      kind: 'couch',
      collectionId: 'leather-collection',
      nodeName: 'couch',
      sourcePath: '/models/leather-collection.glb',
      footprintSize: { width: 2.2, depth: 0.95 },
      position: [0, 0, 0],
      rotationY: 0,
    },
    {
      id: 'item-2',
      catalogId: 'end-table-1',
      name: 'End Table',
      kind: 'end-table',
      collectionId: 'end-table',
      nodeName: 'table',
      sourcePath: '/models/end-table.glb',
      footprintSize: { width: 0.8, depth: 0.8 },
      position: [1, 0, 1],
      rotationY: 0,
    },
  ],
}

describe('SceneOutliner', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('renders the empty state when there are no items', () => {
    render(
      <Outliner
        readModel={{ selectedId: null, items: [] }}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onSelectById={vi.fn()}
        onPreviewChange={vi.fn()}
      />,
    )

    expect(screen.getByText('No furniture in the room.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Toggle furniture in room' }),
    ).toBeVisible()
  })

  it('starts expanded and collapses on toggle, saving the preference', async () => {
    const user = userEvent.setup()

    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onSelectById={vi.fn()}
        onPreviewChange={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: /leather couch/i })).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Toggle furniture in room' }),
    )

    expect(
      screen.queryByRole('button', { name: /leather couch/i }),
    ).not.toBeInTheDocument()
    expect(loadBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, true)).toBe(
      false,
    )
  })

  it('forwards selection through item buttons with pointer source', async () => {
    const user = userEvent.setup()
    const onSelectById = vi.fn()

    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onSelectById={onSelectById}
        onPreviewChange={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /end table/i }))

    expect(onSelectById).toHaveBeenCalledWith('item-2', 'panel-pointer')
  })

  it('forwards selection with keyboard source when activated via keyboard', async () => {
    const user = userEvent.setup()
    const onSelectById = vi.fn()

    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onSelectById={onSelectById}
        onPreviewChange={vi.fn()}
      />,
    )

    // Tab to reach the first item button, then press Enter to activate
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')

    expect(onSelectById).toHaveBeenCalledWith(
      expect.any(String),
      'panel-keyboard',
    )
  })

  it('hands Shift+Tab back to selected item controls when requested', () => {
    const onNavigateBackToSelectionControls = vi.fn(() => true)

    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onNavigateBackToSelectionControls={onNavigateBackToSelectionControls}
        onSelectById={vi.fn()}
        onPreviewChange={vi.fn()}
      />,
    )

    const firstItem = screen.getByRole('button', { name: /leather couch/i })
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
      shiftKey: true,
    })

    fireEvent(firstItem, event)

    expect(onNavigateBackToSelectionControls).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('does not hand Shift+Tab back for non-first outliner items', () => {
    const onNavigateBackToSelectionControls = vi.fn(() => true)

    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onNavigateBackToSelectionControls={onNavigateBackToSelectionControls}
        onSelectById={vi.fn()}
        onPreviewChange={vi.fn()}
      />,
    )

    const secondItem = screen.getByRole('button', { name: /end table/i })
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: 'Tab',
      shiftKey: true,
    })

    fireEvent(secondItem, event)

    expect(onNavigateBackToSelectionControls).not.toHaveBeenCalled()
    expect(event.defaultPrevented).toBe(false)
  })

  it('applies preview styling to the previewed non-selected item', async () => {
    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onSelectById={vi.fn()}
        previewedId="item-2"
        onPreviewChange={vi.fn()}
      />,
    )

    await waitFor(() => {
      const previewedButton = screen.getByRole('button', { name: /end table/i })
      // item-2 is previewed (not selected) — should have accent bg class
      expect(previewedButton.className).toMatch(/bg-accent/)
    })
  })

  it('does not apply preview styling to the selected item even if it matches previewedId', async () => {
    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onSelectById={vi.fn()}
        previewedId="item-1"
        onPreviewChange={vi.fn()}
      />,
    )

    await waitFor(() => {
      const selectedButton = screen.getByRole('button', {
        name: /leather couch/i,
      })
      // item-1 is selected AND previewed — selected style wins, no accent class
      expect(selectedButton.className).not.toMatch(/bg-accent/)
    })
  })

  it('focuses the preferred item when expanded', async () => {
    const onFocusHandled = vi.fn()

    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={{ token: 1, preferredIndex: 1 }}
        onFocusHandled={onFocusHandled}
        onSelectById={vi.fn()}
        onPreviewChange={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end table/i })).toHaveFocus()
    })
    expect(onFocusHandled).toHaveBeenCalledTimes(1)
  })

  it('falls back to toggle button when collapsed and focus is requested', async () => {
    const onFocusHandled = vi.fn()
    saveBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, false)

    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={{ token: 2, preferredIndex: 1 }}
        onFocusHandled={onFocusHandled}
        onSelectById={vi.fn()}
        onPreviewChange={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Toggle furniture in room' }),
      ).toHaveFocus()
    })
    expect(onFocusHandled).toHaveBeenCalledTimes(1)
  })

  it('focuses the selected item when targetSelectedId is provided', async () => {
    const onFocusHandled = vi.fn()

    render(
      <Outliner
        readModel={{
          ...READ_MODEL,
          selectedId: 'item-2',
        }}
        disabled={false}
        focusRequest={{ token: 2, targetSelectedId: 'item-2' }}
        onFocusHandled={onFocusHandled}
        onSelectById={vi.fn()}
        onPreviewChange={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end table/i })).toHaveFocus()
    })
    expect(onFocusHandled).toHaveBeenCalledTimes(1)
  })

  it('focuses the outliner container when requested', async () => {
    const onFocusHandled = vi.fn()

    render(
      <Outliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={{ token: 3, focusContainer: true }}
        onFocusHandled={onFocusHandled}
        onSelectById={vi.fn()}
        onPreviewChange={vi.fn()}
      />,
    )

    const outlinerRegion = screen.getByLabelText('Furniture in room')

    await waitFor(() => {
      expect(outlinerRegion).toHaveFocus()
    })
    expect(onFocusHandled).toHaveBeenCalledTimes(1)
  })

  describe('preview callbacks', () => {
    it('calls onPreviewChange with id and source on pointer enter', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()

      render(
        <Outliner
          readModel={READ_MODEL}
          disabled={false}
          focusRequest={null}
          onFocusHandled={vi.fn()}
          onSelectById={vi.fn()}
          onPreviewChange={onPreviewChange}
        />,
      )

      await user.hover(screen.getByRole('button', { name: /leather couch/i }))

      expect(onPreviewChange).toHaveBeenCalledWith('item-1', 'outliner-hover')
    })

    it('calls onPreviewChange with null on pointer leave', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()

      render(
        <Outliner
          readModel={READ_MODEL}
          disabled={false}
          focusRequest={null}
          onFocusHandled={vi.fn()}
          onSelectById={vi.fn()}
          onPreviewChange={onPreviewChange}
        />,
      )

      await user.hover(screen.getByRole('button', { name: /leather couch/i }))
      await user.unhover(screen.getByRole('button', { name: /leather couch/i }))

      expect(onPreviewChange).toHaveBeenLastCalledWith(null, 'outliner-hover')
    })

    it('calls onPreviewChange with id and source on focus', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()

      render(
        <Outliner
          readModel={READ_MODEL}
          disabled={false}
          focusRequest={null}
          onFocusHandled={vi.fn()}
          onSelectById={vi.fn()}
          onPreviewChange={onPreviewChange}
        />,
      )

      await user.tab()
      // tab to the toggle button, then tab again to enter items
      await user.tab()

      expect(onPreviewChange).toHaveBeenCalledWith(
        expect.any(String),
        'outliner-focus',
      )
    })

    it('calls onPreviewChange with null on blur', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()

      render(
        <Outliner
          readModel={READ_MODEL}
          disabled={false}
          focusRequest={null}
          onFocusHandled={vi.fn()}
          onSelectById={vi.fn()}
          onPreviewChange={onPreviewChange}
        />,
      )

      await user.tab()
      await user.tab()
      // Move focus away
      await user.tab()

      expect(onPreviewChange).toHaveBeenCalledWith(null, 'outliner-focus')
    })

    it('does not call onPreviewChange when disabled', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()

      render(
        <Outliner
          readModel={READ_MODEL}
          disabled={true}
          focusRequest={null}
          onFocusHandled={vi.fn()}
          onSelectById={vi.fn()}
          onPreviewChange={onPreviewChange}
        />,
      )

      const button = screen.getByRole('button', { name: /leather couch/i })
      await user.hover(button)

      expect(onPreviewChange).not.toHaveBeenCalled()
    })
  })
})
