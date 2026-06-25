import type { KeyboardEvent } from 'react'
import { useEditorInteractionsEnabled } from '@/core/stores/editor-lifecycle-store'
import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { resolveSelectionControlsInteractivity } from './selection-controls-interactivity'
import { SelectedItemTools } from './selected-item-tools'

export interface SelectedItemToolbarProps {
  isCatalogDrawerOpen: boolean
}

/**
 * The connected selected-item action toolbar (rotate + delete). It owns the
 * command wiring, disabled/suppressed state, focus ref, and Escape-to-room-view
 * behavior. Callers decide where it sits: desktop floats it near the object,
 * mobile docks it above the details panel.
 */
export function SelectedItemToolbar({
  isCatalogDrawerOpen,
}: SelectedItemToolbarProps) {
  const interaction = useSelectedItemInteraction()
  const selectedFurniture = useSelectedFurniture()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const dispatch = useCommandDispatch()
  const { selectedToolbarRef } = useEditorRefs()

  if (selectedFurniture === null) {
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
    <div
      ref={selectedToolbarRef}
      data-slot="selected-item-toolbar"
      className="pointer-events-auto rounded-xl border bg-background/90 p-1.5 shadow-sm backdrop-blur-sm"
      inert={interactivity.suppressed}
      onKeyDown={handleEscapeToRoomView}
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
  )
}
