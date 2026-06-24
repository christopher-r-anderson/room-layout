import { Button } from '@/shared/ui/button'
import { CatalogDrawer } from '@/features/catalog/catalog-drawer'
import { CatalogAddButton } from '@/features/catalog/catalog-add-button'
import { HistoryTools } from '@/features/history/history-tools'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { IconDotsVertical, IconHomeCog } from '@tabler/icons-react'
import { RoomDrawer } from '@/features/room-surface/room-drawer'
import { HeaderMoreActionsDrawer } from './header-more-actions-drawer'
import { ROOM_TRIGGER_TOOLTIP } from '@/features/room-surface/room-copy'
import {
  HEADER_MORE_ACTIONS_CONTENT_ID,
  topHeaderDialogOpenChange,
} from './top-header-dialog-bindings'
import { headerFocusRegistry } from './header-focus-registry'
import type { TopHeaderMobileProps } from './top-header.types'

export function TopHeaderMobile({
  isCatalogDrawerOpen,
  editorInteractionsEnabled,
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  history,
  mobileRoomDrawerRef,
  isRoomSurfaceOpen,
  isHeaderMoreActionsOpen,
  blockingOverlayOpen,
  startOverDisabled,
  onFloorFinishChange,
  onOpenKeyboardShortcutsFromHeaderMoreActions,
  onOpenStartOverFromHeaderMoreActions,
  onOpenProjectInfoFromHeaderMoreActions,
  topHeaderRef,
  onWallFinishChange,
  wallFinishId,
  wallFinishes,
}: TopHeaderMobileProps) {
  return (
    <div
      ref={topHeaderRef}
      data-top-header-root
      className="pointer-events-auto"
    >
      <div
        role="toolbar"
        aria-label="Mobile header actions"
        className="rounded-xl border border-border/70 bg-background/75 p-2 backdrop-blur-[2px]"
      >
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <CatalogDrawer triggerButton={<CatalogAddButton />} />
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      ref={headerFocusRegistry.register('top-header-room')}
                      type="button"
                      variant="secondary"
                      size="toolbar"
                      aria-controls="room-drawer"
                      aria-expanded={isRoomSurfaceOpen}
                      aria-haspopup="dialog"
                      onClick={() => {
                        topHeaderDialogOpenChange.roomSurface(
                          !isRoomSurfaceOpen,
                        )
                      }}
                    >
                      <IconHomeCog size={16} aria-hidden="true" />
                      Room
                    </Button>
                  }
                />
                <TooltipContent side="bottom">
                  {ROOM_TRIGGER_TOOLTIP}
                </TooltipContent>
              </Tooltip>
            </div>
          </div>
          <div
            className="flex items-center gap-2 justify-self-end"
            inert={isCatalogDrawerOpen}
          >
            <HistoryTools
              canRedo={history.canRedo}
              canUndo={history.canUndo}
              displayLabels={false}
              buttonSize="toolbar-icon"
              editorInteractionsEnabled={editorInteractionsEnabled}
            />
            <Button
              ref={headerFocusRegistry.register('top-header-more-actions')}
              type="button"
              variant="secondary"
              size="toolbar-icon"
              aria-label="More actions"
              aria-controls={HEADER_MORE_ACTIONS_CONTENT_ID}
              aria-expanded={isHeaderMoreActionsOpen}
              aria-haspopup="dialog"
              onClick={() => {
                topHeaderDialogOpenChange.headerMoreActions(true)
              }}
            >
              <IconDotsVertical aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <RoomDrawer
        contentRef={mobileRoomDrawerRef}
        open={isRoomSurfaceOpen}
        onOpenChange={(open) => {
          topHeaderDialogOpenChange.roomSurface(open)
        }}
        onCloseAutoFocus={() => {
          headerFocusRegistry.focus('top-header-room')
        }}
        restoreFocusOnClose={!blockingOverlayOpen}
        floorFinishId={floorFinishId}
        floorFinishLoading={floorFinishLoading}
        floorFinishes={floorFinishes}
        onFloorFinishChange={onFloorFinishChange}
        wallFinishId={wallFinishId}
        wallFinishes={wallFinishes}
        onWallFinishChange={onWallFinishChange}
      />

      <HeaderMoreActionsDrawer
        contentId={HEADER_MORE_ACTIONS_CONTENT_ID}
        shareDisabled={!editorInteractionsEnabled}
        startOverDisabled={!editorInteractionsEnabled || startOverDisabled}
        open={isHeaderMoreActionsOpen}
        onOpenChange={(open) => {
          topHeaderDialogOpenChange.headerMoreActions(open)
        }}
        onCloseAutoFocus={() => {
          headerFocusRegistry.focus('top-header-more-actions')
        }}
        onOpenKeyboardShortcuts={onOpenKeyboardShortcutsFromHeaderMoreActions}
        onOpenStartOver={onOpenStartOverFromHeaderMoreActions}
        onOpenProjectInfo={onOpenProjectInfoFromHeaderMoreActions}
      />
    </div>
  )
}
