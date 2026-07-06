import { useHasSelection } from '@/core/stores/scene-document-store'
import { CameraTools } from '@/features/camera/camera-tools'
import { DeleteConfirmationDialogHost } from '@/features/selection/delete-confirmation-dialog-host'
import { StatusMessage } from './feedback/status-message'
import { Outliner } from '@/features/outliner/outliner'
import { SelectedDetailsPanel } from '@/features/selection/selected-details-panel'
import { FloatingSelectedItemSite } from '@/features/selection/floating-selected-item-site'
import { SelectedItemToolbar } from '@/features/selection/selected-item-toolbar'
import { SelectedDetailsPlaceholder } from '@/features/selection/selected-details-view'
import { TopHeaderDesktop } from './top-header/top-header-desktop'
import { TopHeaderMobile } from './top-header/top-header-mobile'
import { TopHeaderDialogs } from './top-header/top-header-dialogs'
import { useExclusionRegistry } from '@/shared/layout/overlay-exclusion-context'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { useDialogOpen } from '@/core/stores/dialog-store'
import { ROOM_SURFACE_DIALOG_ID } from '@/features/room-surface/room-surface-dialog-definition'
import { cn } from '@/shared/lib/utils'

export function EditorOverlay() {
  const registerExclusionElement = useExclusionRegistry()
  const hasSelection = useHasSelection()
  const isRoomSurfaceOpen = useDialogOpen(ROOM_SURFACE_DIALOG_ID)
  const layoutMode = useHeaderLayoutMode()
  const isDesktop = layoutMode === 'desktop'

  return (
    <>
      <div className="pointer-events-none fixed inset-2 flex flex-col justify-between gap-2">
        {isDesktop ? <TopHeaderDesktop /> : <TopHeaderMobile />}

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

        <div className="grid gap-2 md:justify-items-start md:items-end md:grid-cols-2 md:grid-rows-[1fr_auto]">
          <StatusMessage
            ref={registerExclusionElement('status')}
            className="pointer-events-auto"
          />

          {isDesktop && (
            <Outliner
              ref={registerExclusionElement('outliner')}
              className="md:min-w-80 pointer-events-auto"
            />
          )}

          <div className="flex flex-col gap-2 pointer-events-auto md:col-start-2 md:row-start-1 md:row-span-2 md:justify-self-end">
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
      </div>
      <TopHeaderDialogs />
      <DeleteConfirmationDialogHost />
    </>
  )
}
