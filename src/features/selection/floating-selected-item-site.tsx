import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import { toolbarInteractionActions } from '@/core/stores/toolbar-interaction-store'
import {
  useSelectedItemActionsSizeRef,
  useSelectedItemPlacement,
} from './selected-item-placement-context'
import { SelectedItemToolbar } from './selected-item-toolbar'

/**
 * Desktop mount for the selected-item toolbar: positions it near the selected
 * object using the computed placement. The toolbar content and behavior live in
 * SelectedItemToolbar; this wrapper only owns where it floats. Pointer/focus
 * here report toolbar engagement so the placement engine pins the position while
 * the user is using it (see use-pinned-placement), keeping rotate buttons under
 * the cursor across repeated clicks.
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
      // `top-0 left-0` is the origin for the JS-computed translate3d below; those
      // pixel offsets are physical, so the anchor stays physical, not logical.
      className="absolute top-0 left-0 pointer-events-auto transition-[transform,opacity] duration-150 ease-out"
      aria-label="Selected item actions"
      data-selected-toolbar-candidate={placement.candidateId}
      data-selected-toolbar-mode="floating"
      style={{
        transform: `translate3d(${String(placement.left)}px, ${String(placement.top)}px, 0)`,
      }}
      onPointerEnter={() => {
        toolbarInteractionActions.setPointerOver(true)
      }}
      onPointerLeave={() => {
        toolbarInteractionActions.setPointerOver(false)
      }}
      onFocus={() => {
        toolbarInteractionActions.setFocusWithin(true)
      }}
      onBlur={() => {
        toolbarInteractionActions.setFocusWithin(false)
      }}
    >
      <SelectedItemToolbar />
    </section>
  )
}
