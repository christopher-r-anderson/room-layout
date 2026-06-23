import { useEditorInteractionsEnabled } from '@/core/stores/editor-runtime-store'
import { useSelectedFurniture } from '@/core/stores/scene-state-store'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useSelectedItemInteraction } from './selected-item-interaction-context'
import {
  useSelectedItemActionsSizeRef,
  useSelectedItemPlacement,
} from './selected-item-placement-context'
import { resolveSelectionControlsInteractivity } from './selection-controls-interactivity'
import { SelectionToolsOther } from './selection-tools-other'

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
    >
      <div className="rounded-xl border bg-background/90 p-1.5 shadow-sm backdrop-blur-sm">
        <SelectionToolsOther
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
