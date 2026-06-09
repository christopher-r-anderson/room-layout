import type { FurnitureItem } from '@/app/scene-object.types'
import { SelectionToolsOther } from './selection-tools-other'
import { cn } from '@/lib/utils'
import type { CSSProperties, Ref } from 'react'
import type { ToolbarFloatingCandidateId } from '@/lib/ui/selected-toolbar-placement'

export type SelectedActionsViewPlacementMode = 'floating' | 'docked'

export function SelectedActionsView({
  className,
  disabled,
  onOpenDeleteDialog,
  onPrepareDelete,
  onRotateSelection,
  placementCandidateId,
  placementMode,
  sectionRef,
  selectedFurniture,
  style,
}: {
  className?: string
  disabled: boolean
  onOpenDeleteDialog: () => void
  onPrepareDelete: () => void
  onRotateSelection: (direction: -1 | 1) => void
  placementCandidateId?: ToolbarFloatingCandidateId
  placementMode?: SelectedActionsViewPlacementMode
  sectionRef?: Ref<HTMLElement>
  selectedFurniture: FurnitureItem
  style?: CSSProperties
}) {
  return (
    <section
      ref={sectionRef}
      className={cn('pointer-events-auto', className)}
      aria-label="Selected item actions"
      data-selected-toolbar-candidate={placementCandidateId}
      data-selected-toolbar-mode={placementMode}
      style={style}
    >
      <div className="rounded-xl border bg-background/90 p-1.5 shadow-sm backdrop-blur-sm">
        <SelectionToolsOther
          editorInteractionsEnabled={!disabled}
          onOpenDeleteDialog={onOpenDeleteDialog}
          onPrepareDelete={onPrepareDelete}
          onRotateSelection={onRotateSelection}
          selectedFurniture={selectedFurniture}
        />
      </div>
    </section>
  )
}
