import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { SelectionToolsOther } from './selection-tools-other'
import { cn } from '@/lib/utils'
import type { CSSProperties, Ref } from 'react'
import type {
  ToolbarPlacementMode,
  ToolbarSide,
} from '@/lib/ui/selected-toolbar-placement'

export function SelectedItemActions({
  className,
  disabled,
  onOpenDeleteDialog,
  onPrepareDelete,
  onRotateSelection,
  placementMode = 'floating',
  placementSide,
  sectionRef,
  selectedFurniture,
  style,
}: {
  className?: string
  disabled: boolean
  onOpenDeleteDialog: () => void
  onPrepareDelete: () => void
  onRotateSelection: (direction: -1 | 1) => void
  placementMode?: ToolbarPlacementMode
  placementSide?: ToolbarSide
  sectionRef?: Ref<HTMLElement>
  selectedFurniture: FurnitureItem
  style?: CSSProperties
}) {
  return (
    <section
      ref={sectionRef}
      className={cn('pointer-events-auto', className)}
      aria-label="Selected item actions"
      aria-hidden={placementMode === 'hidden' ? true : undefined}
      inert={placementMode === 'hidden' ? true : undefined}
      data-selected-toolbar-mode={placementMode}
      data-selected-toolbar-side={placementSide}
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
