// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { SceneReadModel } from '@/scene/scene.types'
import { SceneOutliner } from './scene-outliner'

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
  it('renders the empty state when there are no items', () => {
    render(
      <SceneOutliner
        readModel={{ selectedId: null, items: [] }}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onSelectById={vi.fn()}
      />,
    )

    expect(screen.getByText('No furniture in the room.')).toBeVisible()
  })

  it('forwards selection through item buttons', async () => {
    const user = userEvent.setup()
    const onSelectById = vi.fn()

    render(
      <SceneOutliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={null}
        onFocusHandled={vi.fn()}
        onSelectById={onSelectById}
      />,
    )

    await user.click(screen.getByRole('button', { name: /end table/i }))

    expect(onSelectById).toHaveBeenCalledWith('item-2')
  })

  it('applies focus requests to the preferred remaining item', async () => {
    const onFocusHandled = vi.fn()

    render(
      <SceneOutliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={{ token: 1, preferredIndex: 1 }}
        onFocusHandled={onFocusHandled}
        onSelectById={vi.fn()}
      />,
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end table/i })).toHaveFocus()
    })
    expect(onFocusHandled).toHaveBeenCalledTimes(1)
  })

  it('focuses the selected item when targetSelectedId is provided', async () => {
    const onFocusHandled = vi.fn()

    render(
      <SceneOutliner
        readModel={{
          ...READ_MODEL,
          selectedId: 'item-2',
        }}
        disabled={false}
        focusRequest={{ token: 2, targetSelectedId: 'item-2' }}
        onFocusHandled={onFocusHandled}
        onSelectById={vi.fn()}
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
      <SceneOutliner
        readModel={READ_MODEL}
        disabled={false}
        focusRequest={{ token: 3, focusContainer: true }}
        onFocusHandled={onFocusHandled}
        onSelectById={vi.fn()}
      />,
    )

    const outlinerRegion = screen.getByLabelText('Furniture in room')

    await waitFor(() => {
      expect(outlinerRegion).toHaveFocus()
    })
    expect(onFocusHandled).toHaveBeenCalledTimes(1)
  })
})
