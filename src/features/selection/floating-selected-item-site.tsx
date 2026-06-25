import type { KeyboardEvent } from 'react'
import { useEditorInteractionsEnabled } from '@/core/stores/editor-lifecycle-store'
import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import {
  useSelectedItemActionsSizeRef,
  useSelectedItemPlacement,
} from './selected-item-placement-context'
import { resolveSelectionControlsInteractivity } from './selection-controls-interactivity'
import { SelectedItemTools } from './selected-item-tools'

export interface FloatingSelectedItemSiteProps {
  isCatalogDrawerOpen: boolean
}

export function FloatingSelectedItemSite({
  isCatalogDrawerOpen,
}: FloatingSelectedItemSiteProps) {
  const placement = useSelectedItemPlacement()
  const actionsSizeRef = useSelectedItemActionsSizeRef()
  const interaction = useSelectedItemInteraction()
  const selectedFurniture = useSelectedFurniture()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const dispatch = useCommandDispatch()
  const { selectedToolbarRef } = useEditorRefs()

  if (selectedFurniture === null) {
    return null
  }
  if (placement.site !== 'floating') {
    return null
  }

  const interactivity = resolveSelectionControlsInteractivity({
    editorInteractionsEnabled,
    isCatalogDrawerOpen,
  })

  const handleOpenDeleteDialog = () => {
    try {
      dispatch({ kind: 'open-delete-dialog', returnFocusTo: 'outliner' })
    } finally {
      interaction.consumeBlurCommitSuppression()
    }
  }

  // Escape peels one layer at a time: a focused action's tooltip dismisses on
  // the first Escape (marking the event handled), and the next Escape reaches
  // this boundary and returns focus to the room view without clearing the
  // selection (a further Escape, now on the room view, clears it).
  const handleEscapeToRoomView = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key !== 'Escape' || event.defaultPrevented) {
      return
    }
    event.preventDefault()
    event.stopPropagation()
    dispatch({ kind: 'focus-room-view' })
  }

  return (
    <section
      ref={actionsSizeRef}
      className="absolute top-0 left-0 pointer-events-auto transition-[transform,opacity] duration-150 ease-out"
      aria-label="Selected item actions"
      data-selected-toolbar-candidate={placement.candidateId}
      data-selected-toolbar-mode="floating"
      style={{
        transform: `translate3d(${String(placement.left)}px, ${String(placement.top)}px, 0)`,
      }}
      inert={interactivity.suppressed}
      onKeyDown={handleEscapeToRoomView}
    >
      <div
        ref={selectedToolbarRef}
        className="rounded-xl border bg-background/90 p-1.5 shadow-sm backdrop-blur-sm"
      >
        <SelectedItemTools
          controlsDisabled={interactivity.disabled}
          disabledMessage={interactivity.disabledMessage}
          onOpenDeleteDialog={handleOpenDeleteDialog}
          onPrepareDelete={interaction.prepareDeleteBlurSuppression}
          onRotateSelection={(direction) => {
            dispatch({ kind: 'rotate-selection', direction })
          }}
        />
      </div>
    </section>
  )
}
