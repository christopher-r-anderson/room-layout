// @vitest-environment jsdom
import { render, screen } from '@testing-library/react'
import { createRef } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { EditorRefsProvider } from '@/app/contexts/editor-refs-context'
import { OverlayLayoutProvider } from '@/app/contexts/overlay-layout-context'
import { createHistoryState } from '@/lib/ui/editor-history'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/editor-state/editor-runtime-store'
import { resetDialogStore } from '@/editor-state/dialog-store'
import {
  sceneStateActions,
  resetSceneStateStore,
} from '@/editor-state/scene-state-store'
import { DockedSelectedItemSite } from './docked-selected-item-site'
import { SelectedItemInteractionProvider } from './selected-item-interaction-context'
import { SelectedItemPlacementProvider } from './use-selected-item-placement-context'
import { FURNITURE_ITEM } from './test-fixtures'

beforeEach(() => {
  resetDialogStore()
  resetEditorRuntimeStore()
  resetSceneStateStore()
  editorRuntimeActions.markAssetsReady()
  sceneStateActions.setHistory(createHistoryState([FURNITURE_ITEM]))
  sceneStateActions.setSelectedId(FURNITURE_ITEM.id)
})

describe('DockedSelectedItemSite', () => {
  it('attaches the controls ref when hidden placement still shows details', () => {
    const roomViewRef = createRef<HTMLElement>()
    const selectedItemControlsRef = createRef<HTMLDivElement>()
    const registerExclusionElement = vi.fn(() => vi.fn())

    render(
      <TooltipProvider>
        <EditorRefsProvider value={{ roomViewRef, selectedItemControlsRef }}>
          <OverlayLayoutProvider
            value={{
              exclusionRects: {},
              registerExclusionElement,
              syncLayoutMode: vi.fn(),
            }}
          >
            <SelectedItemInteractionProvider>
              <SelectedItemPlacementProvider
                value={{
                  placement: {
                    site: 'hidden',
                    reason: 'computed-hidden',
                  },
                  actionsSizeRef: vi.fn(),
                }}
              >
                <DockedSelectedItemSite
                  onOpenDeleteDialog={vi.fn()}
                  onRotateSelection={vi.fn()}
                  onInvalidSelectedItemDetailValue={(fieldLabel) =>
                    `${fieldLabel} must be a valid number.`
                  }
                  onUpdateSelectedItemDetails={() => ({
                    ok: true,
                    item: FURNITURE_ITEM,
                  })}
                />
              </SelectedItemPlacementProvider>
            </SelectedItemInteractionProvider>
          </OverlayLayoutProvider>
        </EditorRefsProvider>
      </TooltipProvider>,
    )

    expect(
      screen.getByRole('region', { name: 'Placement' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('region', { name: 'Selected item actions' }),
    ).not.toBeInTheDocument()
    expect(selectedItemControlsRef.current).toContainElement(
      screen.getByLabelText('Distance from left wall (m)'),
    )
  })
})
