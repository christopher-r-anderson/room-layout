// @vitest-environment jsdom

import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createHistoryState } from '@/shared/lib/ui/editor-history'
import {
  loadBooleanPreference,
  saveBooleanPreference,
} from '@/shared/lib/ui/storage'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import { dialogActions, resetDialogStore } from '@/editor-state/dialog-store'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/editor-state/editor-runtime-store'
import {
  resetSceneStateStore,
  sceneStateActions,
} from '@/editor-state/scene-state-store'
import {
  resetSelectionMetaStore,
  selectionMetaActions,
  selectionMetaStore,
} from '@/editor-state/selection-meta-store'
import type { PanelInteractionSource } from '@/editor-state/types/interaction.types'
import type { ScenePanelReadModel } from '@/editor-state/types/scene-panel.types'
import { Outliner } from './outliner'

const OUTLINER_EXPANDED_PREFERENCE_KEY = 'outliner-expanded'

const READ_MODEL: ScenePanelReadModel = {
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

function seedScene(readModel: ScenePanelReadModel = READ_MODEL) {
  sceneStateActions.setHistory(createHistoryState(readModel.items))
  sceneStateActions.setSelectedId(readModel.selectedId)
}

function renderOutliner({
  onSelectById,
  onPreviewChange,
}: {
  onSelectById?: (id: string, source: PanelInteractionSource) => void
  onPreviewChange?: (
    id: string | null,
    source: 'outliner-hover' | 'outliner-focus',
  ) => void
} = {}) {
  const handleSelectById = onSelectById ?? vi.fn()
  const handlePreviewChange = onPreviewChange ?? vi.fn()

  render(
    <Outliner
      onSelectById={handleSelectById}
      onPreviewChange={handlePreviewChange}
    />,
  )
}

describe('SceneOutliner', () => {
  beforeEach(() => {
    window.localStorage.clear()
    resetDialogStore()
    resetEditorRuntimeStore()
    resetSceneStateStore()
    resetSelectionMetaStore()
    dialogActions.configureRuntimeContext({
      isDialogsEnabled: () => true,
      getSelectedFurniture: () => READ_MODEL.items[0] ?? null,
      canStartOver: () => true,
    })
    dialogActions.registerDialogDefinition({
      id: DIALOG_IDS.delete,
      kind: 'blocking',
      canOpen: (context) => context.getSelectedFurniture() !== null,
    })
    editorRuntimeActions.markAssetsReady()
    seedScene()
  })

  it('renders the empty state when there are no items', () => {
    seedScene({ selectedId: null, items: [] })

    renderOutliner()

    expect(screen.getByText('No furniture in the room.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Toggle furniture list visibility' }),
    ).toBeVisible()
  })

  it('starts expanded and collapses on toggle, saving the preference', async () => {
    const user = userEvent.setup()

    renderOutliner()

    expect(screen.getByRole('button', { name: /leather couch/i })).toBeVisible()

    await user.click(
      screen.getByRole('button', { name: 'Toggle furniture list visibility' }),
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

    renderOutliner({ onSelectById })

    await user.click(screen.getByRole('button', { name: /end table/i }))

    expect(onSelectById).toHaveBeenCalledWith('item-2', 'panel-pointer')
  })

  it('forwards selection with keyboard source when activated via keyboard', async () => {
    const user = userEvent.setup()
    const onSelectById = vi.fn()

    renderOutliner({ onSelectById })
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')

    expect(onSelectById).toHaveBeenCalledWith(
      expect.any(String),
      'panel-keyboard',
    )
  })

  it('applies preview styling to the previewed non-selected item', async () => {
    sceneStateActions.setPreviewedId('item-2')

    renderOutliner()

    await waitFor(() => {
      const previewedButton = screen.getByRole('button', { name: /end table/i })
      expect(previewedButton.className).toMatch(/bg-accent/)
    })
  })

  it('does not apply preview styling to the selected item even if it matches previewedId', async () => {
    sceneStateActions.setPreviewedId('item-1')

    renderOutliner()

    await waitFor(() => {
      const selectedButton = screen.getByRole('button', {
        name: /leather couch/i,
      })
      expect(selectedButton.className).not.toMatch(/bg-accent/)
    })
  })

  it('focuses the preferred item when expanded', async () => {
    selectionMetaActions.requestOutlinerFocus({ token: 1, preferredIndex: 1 })

    renderOutliner()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end table/i })).toHaveFocus()
    })
    expect(selectionMetaStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('falls back to toggle button when collapsed and focus is requested', async () => {
    saveBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, false)
    selectionMetaActions.requestOutlinerFocus({ token: 2, preferredIndex: 1 })

    renderOutliner()

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Toggle furniture list visibility',
        }),
      ).toHaveFocus()
    })
    expect(selectionMetaStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('focuses the selected item when targetSelectedId is provided', async () => {
    seedScene({
      ...READ_MODEL,
      selectedId: 'item-2',
    })
    selectionMetaActions.requestOutlinerFocus({
      token: 2,
      targetSelectedId: 'item-2',
    })

    renderOutliner()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end table/i })).toHaveFocus()
    })
    expect(selectionMetaStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('focuses the outliner container when requested', async () => {
    selectionMetaActions.requestOutlinerFocus({
      token: 3,
      focusContainer: true,
    })

    renderOutliner()
    const outlinerRegion = screen.getByLabelText('Furniture in room')

    await waitFor(() => {
      expect(outlinerRegion).toHaveFocus()
    })
    expect(selectionMetaStore.getState().outlinerFocusRequest).toBeNull()
  })

  describe('preview callbacks', () => {
    it('calls onPreviewChange with id and source on pointer enter', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()

      renderOutliner({ onPreviewChange })
      await user.hover(screen.getByRole('button', { name: /leather couch/i }))

      expect(onPreviewChange).toHaveBeenCalledWith('item-1', 'outliner-hover')
    })

    it('calls onPreviewChange with null on pointer leave', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()

      renderOutliner({ onPreviewChange })
      await user.hover(screen.getByRole('button', { name: /leather couch/i }))
      await user.unhover(screen.getByRole('button', { name: /leather couch/i }))

      expect(onPreviewChange).toHaveBeenLastCalledWith(null, 'outliner-hover')
    })

    it('calls onPreviewChange with id and source on focus', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()

      renderOutliner({ onPreviewChange })
      await user.tab()
      await user.tab()

      expect(onPreviewChange).toHaveBeenCalledWith(
        expect.any(String),
        'outliner-focus',
      )
    })

    it('calls onPreviewChange with null on blur', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()

      renderOutliner({ onPreviewChange })
      await user.tab()
      await user.tab()
      await user.tab()

      expect(onPreviewChange).toHaveBeenCalledWith(null, 'outliner-focus')
    })

    it('does not call onPreviewChange while a blocking dialog is open', async () => {
      const user = userEvent.setup()
      const onPreviewChange = vi.fn()
      dialogActions.openDialog(DIALOG_IDS.delete)

      renderOutliner({ onPreviewChange })
      const button = screen.getByRole('button', { name: /leather couch/i })
      await user.hover(button)

      expect(button).toBeDisabled()
      expect(onPreviewChange).not.toHaveBeenCalled()
    })
  })
})
