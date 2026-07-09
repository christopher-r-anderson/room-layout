import { useHasSelection } from '@/core/stores/selection-store'
import { CameraTools } from '@/features/camera/camera-tools'
import { DeleteConfirmationDialogHost } from '@/features/selection/delete-confirmation-dialog-host'
import { Outliner } from '@/features/outliner/outliner'
import { SelectedDetailsPanel } from '@/features/selection/selected-details-panel'
import { FloatingSelectedItemSite } from '@/features/selection/floating-selected-item-site'
import { SelectedItemToolbar } from '@/features/selection/selected-item-toolbar'
import { SelectedDetailsPlaceholder } from '@/features/selection/selected-details-view'
import { RoomSidebar } from '@/features/room-surface/room-sidebar'
import { TopHeaderDesktop } from './top-header/top-header-desktop'
import { TopHeaderMobile } from './top-header/top-header-mobile'
import { TopHeaderDialogs } from './top-header/top-header-dialogs'
import { topHeaderFocusRegistry } from './top-header/top-header-focus'
import { useExclusionRegistry } from '@/shared/layout/overlay-exclusion-context'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { dialogActions, useDialogOpen } from '@/core/stores/dialog-store'
import { ROOM_SURFACE_DIALOG_ID } from '@/features/room-surface/room-surface-dialog-definition'
import { cn } from '@/shared/lib/utils'

// The header chrome and the editor panels mount into separate landmarks (the
// shell's <header> and <main> in EditorBody) but ship as one chunk.

export function EditorHeader() {
  const layoutMode = useHeaderLayoutMode()

  return (
    <>
      {layoutMode === 'desktop' ? <TopHeaderDesktop /> : <TopHeaderMobile />}
      <TopHeaderDialogs />
    </>
  )
}

export function EditorPanels() {
  const registerExclusionElement = useExclusionRegistry()
  const hasSelection = useHasSelection()
  const isRoomSurfaceOpen = useDialogOpen(ROOM_SURFACE_DIALOG_ID)
  const layoutMode = useHeaderLayoutMode()
  const isDesktop = layoutMode === 'desktop'

  return (
    <>
      {/* The room panel is content, not header chrome: it lives in <main> so
          the complementary landmark doesn't nest inside the banner. First so
          Tab reaches it right after the room view, mirroring the header toggle
          that opens it. Its close button returns focus to that toggle. */}
      {isDesktop && (
        <RoomSidebar
          ref={registerExclusionElement('room-surface')}
          open={isRoomSurfaceOpen}
          onClose={() => {
            dialogActions.setDialogOpen(ROOM_SURFACE_DIALOG_ID, false)
            topHeaderFocusRegistry.focus('top-header-room')
          }}
        />
      )}

      {isDesktop && <FloatingSelectedItemSite />}

      {/* When the room panel is open, clear its full width plus the standard
          inset gap so the toolbar isn't butted against the panel edge. The panel
          is pinned to the physical right edge, so this clearance is physical too. */}
      <CameraTools
        ref={registerExclusionElement('camera-tools')}
        className={cn(
          'z-20 pointer-events-auto self-end mt-28 mb-auto',
          isDesktop &&
            isRoomSurfaceOpen &&
            // logical-css-allow: clears the right-pinned room panel
            'mr-[calc(var(--spacing-room-panel)+var(--spacing)*2)]',
        )}
        hasSelection={hasSelection}
        displayLabels={isDesktop && !isRoomSurfaceOpen}
      />

      {/* z-10: keeps the panels above the z-0 canvas, which is a later,
          positioned sibling inside <main>. */}
      <div className="z-10 grid gap-2 md:justify-items-start md:items-end md:grid-cols-2">
        {isDesktop && (
          <Outliner
            ref={registerExclusionElement('outliner')}
            className="md:min-w-80 pointer-events-auto"
          />
        )}

        <div className="flex flex-col gap-2 pointer-events-auto md:col-start-2 md:justify-self-end">
          {!isDesktop && hasSelection ? (
            <SelectedItemToolbar className="w-fit" />
          ) : null}
          {hasSelection ? (
            <SelectedDetailsPanel
              ref={registerExclusionElement('selected-details')}
            />
          ) : (
            <SelectedDetailsPlaceholder aria-hidden="true" />
          )}
        </div>
      </div>

      <DeleteConfirmationDialogHost />
    </>
  )
}
