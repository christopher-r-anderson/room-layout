// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
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
      screen.getByRole('button', { name: 'Toggle furniture list' }),
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
      screen.getByRole('button', { name: 'Toggle furniture list' }),
    )

    expect(
      screen.queryByRole('button', { name: /leather couch/i }),
    ).not.toBeInTheDocument()
    expect(loadBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, true)).toBe(
      false,
    )
  })

  it('forwards selection through item buttons', async () => {
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

    expect(onSelectById).toHaveBeenCalledWith('item-2')
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
        screen.getByRole('button', { name: 'Toggle furniture list' }),
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

    const outlinerRegion = screen.getByLabelText('Furniture List')

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
