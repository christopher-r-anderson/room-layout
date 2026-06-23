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
import { dialogActions, resetDialogStore } from '@/core/stores/dialog-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import {
  resetSceneDocumentStore,
  sceneDocumentActions,
} from '@/core/stores/scene-document-store'
import {
  resetSelectionFocusStore,
  selectionFocusActions,
  selectionFocusStore,
} from '@/core/stores/selection-focus-store'
import type { ScenePanelReadModel } from '@/core/types/scene-panel.types'
import { selectById } from '@/core/operations/selection-actions'
import { previewFromOutliner } from '@/core/operations/preview-actions'
import { Outliner } from './outliner'

vi.mock('@/core/operations/selection-actions', () => ({
  selectById: vi.fn(() => ({ ok: true, status: 'selected' }) as const),
  selectByCanvasPointer: vi.fn(),
  clearSelection: vi.fn(),
}))

vi.mock('@/core/operations/preview-actions', () => ({
  previewFromOutliner: vi.fn(),
}))

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
  sceneDocumentActions.setHistory(createHistoryState(readModel.items))
  sceneDocumentActions.setSelectedId(readModel.selectedId)
}

function renderOutliner() {
  render(<Outliner />)
}

describe('SceneOutliner', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.localStorage.clear()
    resetDialogStore()
    resetEditorLifecycleStore()
    resetSceneDocumentStore()
    resetSelectionFocusStore()
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
    editorLifecycleActions.markAssetsReady()
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

    renderOutliner()

    await user.click(screen.getByRole('button', { name: /end table/i }))

    expect(selectById).toHaveBeenCalledWith('item-2', 'panel-pointer')
  })

  it('forwards selection with keyboard source when activated via keyboard', async () => {
    const user = userEvent.setup()

    renderOutliner()
    await user.tab()
    await user.tab()
    await user.keyboard('{Enter}')

    expect(selectById).toHaveBeenCalledWith(
      expect.any(String),
      'panel-keyboard',
    )
  })

  it('applies preview styling to the previewed non-selected item', async () => {
    sceneDocumentActions.setPreviewedId('item-2')

    renderOutliner()

    await waitFor(() => {
      const previewedButton = screen.getByRole('button', { name: /end table/i })
      expect(previewedButton.className).toMatch(/bg-accent/)
    })
  })

  it('does not apply preview styling to the selected item even if it matches previewedId', async () => {
    sceneDocumentActions.setPreviewedId('item-1')

    renderOutliner()

    await waitFor(() => {
      const selectedButton = screen.getByRole('button', {
        name: /leather couch/i,
      })
      expect(selectedButton.className).not.toMatch(/bg-accent/)
    })
  })

  it('focuses the preferred item when expanded', async () => {
    selectionFocusActions.requestOutlinerFocus({ token: 1, preferredIndex: 1 })

    renderOutliner()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end table/i })).toHaveFocus()
    })
    expect(selectionFocusStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('falls back to toggle button when collapsed and focus is requested', async () => {
    saveBooleanPreference(OUTLINER_EXPANDED_PREFERENCE_KEY, false)
    selectionFocusActions.requestOutlinerFocus({ token: 2, preferredIndex: 1 })

    renderOutliner()

    await waitFor(() => {
      expect(
        screen.getByRole('button', {
          name: 'Toggle furniture list visibility',
        }),
      ).toHaveFocus()
    })
    expect(selectionFocusStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('focuses the selected item when targetSelectedId is provided', async () => {
    seedScene({
      ...READ_MODEL,
      selectedId: 'item-2',
    })
    selectionFocusActions.requestOutlinerFocus({
      token: 2,
      targetSelectedId: 'item-2',
    })

    renderOutliner()

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /end table/i })).toHaveFocus()
    })
    expect(selectionFocusStore.getState().outlinerFocusRequest).toBeNull()
  })

  it('focuses the outliner container when requested', async () => {
    selectionFocusActions.requestOutlinerFocus({
      token: 3,
      focusContainer: true,
    })

    renderOutliner()
    const outlinerRegion = screen.getByLabelText('Furniture in room')

    await waitFor(() => {
      expect(outlinerRegion).toHaveFocus()
    })
    expect(selectionFocusStore.getState().outlinerFocusRequest).toBeNull()
  })

  describe('preview callbacks', () => {
    it('previews on pointer enter', async () => {
      const user = userEvent.setup()

      renderOutliner()
      await user.hover(screen.getByRole('button', { name: /leather couch/i }))

      expect(previewFromOutliner).toHaveBeenCalledWith(
        'item-1',
        'outliner-hover',
      )
    })

    it('clears preview on pointer leave', async () => {
      const user = userEvent.setup()

      renderOutliner()
      await user.hover(screen.getByRole('button', { name: /leather couch/i }))
      await user.unhover(screen.getByRole('button', { name: /leather couch/i }))

      expect(previewFromOutliner).toHaveBeenLastCalledWith(
        null,
        'outliner-hover',
      )
    })

    it('previews on focus', async () => {
      const user = userEvent.setup()

      renderOutliner()
      await user.tab()
      await user.tab()

      expect(previewFromOutliner).toHaveBeenCalledWith(
        expect.any(String),
        'outliner-focus',
      )
    })

    it('clears preview on blur', async () => {
      const user = userEvent.setup()

      renderOutliner()
      await user.tab()
      await user.tab()
      await user.tab()

      expect(previewFromOutliner).toHaveBeenCalledWith(null, 'outliner-focus')
    })

    it('does not preview while a blocking dialog is open', async () => {
      const user = userEvent.setup()
      dialogActions.openDialog(DIALOG_IDS.delete)

      renderOutliner()
      const button = screen.getByRole('button', { name: /leather couch/i })
      await user.hover(button)

      expect(button).toBeDisabled()
      expect(previewFromOutliner).not.toHaveBeenCalled()
    })
  })
})
