import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import {
  useSelectedItemActionsSizeRef,
  useSelectedItemPlacement,
} from './selected-item-placement-context'
import { SelectedItemToolbar } from './selected-item-toolbar'

/**
 * Desktop mount for the selected-item toolbar: positions it near the selected
 * object using the computed placement. The toolbar content and behavior live in
 * SelectedItemToolbar; this wrapper only owns where it floats.
 */
export function FloatingSelectedItemSite() {
  const placement = useSelectedItemPlacement()
  const actionsSizeRef = useSelectedItemActionsSizeRef()
  const selectedFurniture = useSelectedFurniture()

  if (selectedFurniture === null) {
    return null
  }
  if (placement.site !== 'floating') {
    return null
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
    >
      <SelectedItemToolbar />
    </section>
  )
}
