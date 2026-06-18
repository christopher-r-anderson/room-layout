import { Button } from '@/shared/ui/button'
import { CatalogDrawer } from '@/features/catalog/catalog-drawer'
import { CatalogAddButton } from '@/features/catalog/catalog-add-button'
import { HistoryTools } from '@/features/history/history-tools'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { IconDotsVertical, IconHomeCog } from '@tabler/icons-react'
import { RoomDrawer } from '@/features/room-surface/room-drawer'
import { HeaderMoreActionsDrawer } from './header-more-actions-drawer'
import { ROOM_TRIGGER_TOOLTIP } from '@/features/room-surface/room-copy'
import type { TopHeaderMobileProps } from './top-header.types'

export function TopHeaderMobile({
  catalog,
  dialogs,
  editorInteractionsEnabled,
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  history,
  mobileRoomDrawerRef,
  mobileRoomTriggerId,
  headerMoreActionsContentId,
  headerMoreActionsTriggerId,
  startOverDisabled,
  onFloorFinishChange,
  onOpenKeyboardShortcutsFromHeaderMoreActions,
  onOpenStartOverFromHeaderMoreActions,
  onOpenProjectInfoFromHeaderMoreActions,
  onShareSceneUrl,
  topHeaderRef,
  onWallFinishChange,
  wallFinishId,
  wallFinishes,
  focusControlById,
}: TopHeaderMobileProps) {
  const isRoomOpen =
    dialogs.isRoomSurfaceOpen && dialogs.roomSurfaceLayout === 'mobile'

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
            <CatalogDrawer
              open={catalog.isCatalogDrawerOpen}
              onOpenChange={catalog.onCatalogDrawerOpenChange}
              triggerButton={<CatalogAddButton />}
              catalog={catalog.catalog}
              catalogIdToAdd={catalog.catalogIdToAdd}
              editorInteractionsEnabled={editorInteractionsEnabled}
              onAddFurniture={catalog.onAddFurniture}
              onCatalogIdToAddChange={catalog.onCatalogIdToAddChange}
            />
            <div className="flex items-center">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      id={mobileRoomTriggerId}
                      type="button"
                      variant="secondary"
                      size="toolbar"
                      aria-controls="room-drawer"
                      aria-expanded={isRoomOpen}
                      aria-haspopup="dialog"
                      onClick={() => {
                        dialogs.onRoomSurfaceOpenChange(!isRoomOpen, {
                          layout: 'mobile',
                          returnFocusTarget: 'room-inline',
                        })
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
            inert={catalog.isCatalogDrawerOpen}
          >
            <HistoryTools
              canRedo={history.canRedo}
              canUndo={history.canUndo}
              displayLabels={false}
              buttonSize="toolbar-icon"
              editorInteractionsEnabled={editorInteractionsEnabled}
              onRedo={history.onRedo}
              onUndo={history.onUndo}
            />
            <Button
              id={headerMoreActionsTriggerId}
              type="button"
              variant="secondary"
              size="toolbar-icon"
              aria-label="More actions"
              aria-controls={headerMoreActionsContentId}
              aria-expanded={dialogs.isHeaderMoreActionsOpen}
              aria-haspopup="dialog"
              onClick={() => {
                dialogs.onHeaderMoreActionsOpenChange(true, {
                  returnFocusTarget: 'header-more-actions',
                })
              }}
            >
              <IconDotsVertical aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <RoomDrawer
        contentRef={mobileRoomDrawerRef}
        open={
          dialogs.isRoomSurfaceOpen && dialogs.roomSurfaceLayout === 'mobile'
        }
        onOpenChange={(open) => {
          dialogs.onRoomSurfaceOpenChange(open, {
            layout: 'mobile',
            returnFocusTarget: 'room-inline',
          })
        }}
        onCloseAutoFocus={() => {
          focusControlById(mobileRoomTriggerId)
        }}
        restoreFocusOnClose={!dialogs.isBlockingOverlayOpen}
        floorFinishId={floorFinishId}
        floorFinishLoading={floorFinishLoading}
        floorFinishes={floorFinishes}
        onFloorFinishChange={onFloorFinishChange}
        wallFinishId={wallFinishId}
        wallFinishes={wallFinishes}
        onWallFinishChange={onWallFinishChange}
      />

      <HeaderMoreActionsDrawer
        contentId={headerMoreActionsContentId}
        shareDisabled={!editorInteractionsEnabled}
        startOverDisabled={!editorInteractionsEnabled || startOverDisabled}
        open={dialogs.isHeaderMoreActionsOpen}
        onOpenChange={(open) => {
          dialogs.onHeaderMoreActionsOpenChange(open, {
            returnFocusTarget: 'header-more-actions',
          })
        }}
        onCloseAutoFocus={() => {
          focusControlById(headerMoreActionsTriggerId)
        }}
        onShareSceneUrl={onShareSceneUrl}
        onOpenKeyboardShortcuts={onOpenKeyboardShortcutsFromHeaderMoreActions}
        onOpenStartOver={onOpenStartOverFromHeaderMoreActions}
        onOpenProjectInfo={onOpenProjectInfoFromHeaderMoreActions}
      />
    </div>
  )
}
