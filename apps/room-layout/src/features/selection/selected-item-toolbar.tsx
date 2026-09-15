import { useCallback, useEffect, useRef, type KeyboardEvent } from 'react'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import { SelectedItemTools } from './selected-item-tools'
import { focusActions, usePendingFocus } from '@/core/stores/focus-store'
import { useSurfaceFocusClaim } from '@/core/layout/use-surface-focus-claim'
import { Surface } from '@/shared/ui/surface'
import { cn } from '@/shared/lib/utils'
import { focusFirstControl } from '@/shared/lib/focus'

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
  const pendingFocus = usePendingFocus()
  const directive =
    pendingFocus?.surface === 'item-actions' ? pendingFocus : null
  const elementRef = useRef<HTMLDivElement | null>(null)
  const claim = useSurfaceFocusClaim('item-actions')

  const surfaceRef = useCallback(
    (element: HTMLDivElement | null) => {
      elementRef.current = element
      claim.claimRef(element)
    },
    [claim],
  )

  // Realizes item-actions focus directives on the first roving-active tool.
  // Passive effect on purpose: the toolbar's roving tabindex is assigned in
  // Base UI's own effects, so at layout-effect time every tool still reads
  // tabindex="-1" and the focusable query would miss. The directive is
  // consumed even if no control matched: a directive for a mounted surface
  // must realize or drop, never linger.
  useEffect(() => {
    if (!directive) {
      return
    }

    focusFirstControl(elementRef.current)
    focusActions.directiveRealized(directive)
  }, [directive])

  if (selectedFurniture === null) {
    return null
  }

  const handleOpenDeleteDialog = () => {
    try {
      dispatch({ kind: 'open-delete-dialog', originSurface: 'item-actions' })
    } finally {
      interaction.consumeBlurCommitSuppression()
    }
  }

  // Escape peels one layer at a time: a focused action's tooltip dismisses
  // the first Escape (Base UI stops its propagation, so it never reaches this
  // boundary), and the next Escape gets here and returns focus to the room
  // view without clearing the selection (a further Escape, now on the room
  // view, clears it).
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
      onFocus={claim.onFocus}
      onBlur={claim.onBlur}
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
