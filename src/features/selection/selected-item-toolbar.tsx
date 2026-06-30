import type { KeyboardEvent } from 'react'
import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { SelectedItemTools } from './selected-item-tools'
import { Surface } from '@/shared/ui/surface'

/**
 * The connected selected-item action toolbar (rotate + delete). It owns the
 * command wiring, disabled state, focus ref, and Escape-to-room-view behavior.
 * Callers decide where it sits: desktop floats it near the object, mobile docks
 * it above the details panel.
 */
export function SelectedItemToolbar() {
  const interaction = useSelectedItemInteraction()
  const selectedFurniture = useSelectedFurniture()
  const dispatch = useCommandDispatch()
  const { selectedToolbarRef } = useEditorRefs()

  if (selectedFurniture === null) {
    return null
  }

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
    <Surface
      ref={selectedToolbarRef}
      padding="snug"
      data-slot="selected-item-toolbar"
      className="pointer-events-auto"
      onKeyDown={handleEscapeToRoomView}
    >
      <SelectedItemTools
        onOpenDeleteDialog={handleOpenDeleteDialog}
        onPrepareDelete={interaction.prepareDeleteBlurSuppression}
        onRotateSelection={(direction) => {
          dispatch({ kind: 'rotate-selection', direction })
        }}
      />
    </Surface>
  )
}
