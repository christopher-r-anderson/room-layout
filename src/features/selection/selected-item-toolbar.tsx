import { useCallback, type KeyboardEvent } from 'react'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { SelectedItemTools } from './selected-item-tools'
import { focusActions } from '@/core/stores/focus-store'
import { Surface } from '@/shared/ui/surface'
import { cn } from '@/shared/lib/utils'
import { isFocusLeaving } from '@/shared/lib/focus'

/**
 * The connected selected-item action toolbar (rotate + delete). It owns the
 * command wiring, disabled state, focus ref, and Escape-to-room-view behavior.
 * Callers decide where it sits: desktop floats it near the object, mobile docks
 * it above the details panel.
 */
export function SelectedItemToolbar({ className }: { className?: string }) {
  const interaction = useSelectedItemInteraction()
  const selectedFurniture = useSelectedFurniture()
  const dispatch = useCommandDispatch()
  const { selectedToolbarRef } = useEditorRefs()

  // Stable so React only calls it on real mount/unmount; the toolbar unmounts
  // without a blur event when a delete clears the selection while it holds
  // focus.
  const surfaceRef = useCallback(
    (element: HTMLDivElement | null) => {
      selectedToolbarRef.current = element
      if (element === null) {
        focusActions.surfaceBlurred('item-actions')
      }
    },
    [selectedToolbarRef],
  )

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
      ref={surfaceRef}
      padding="snug"
      data-slot="selected-item-toolbar"
      className={cn('pointer-events-auto', className)}
      onKeyDown={handleEscapeToRoomView}
      onFocus={() => {
        focusActions.surfaceFocused('item-actions')
      }}
      onBlur={(event) => {
        if (isFocusLeaving(event)) {
          focusActions.surfaceBlurred('item-actions')
        }
      }}
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
