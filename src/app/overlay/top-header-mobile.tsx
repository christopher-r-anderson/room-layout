import { Button } from '@/components/ui/button'
import { CatalogDrawer } from '@/app/catalog/catalog-drawer'
import { CatalogAddButton } from '@/app/catalog/catalog-add-button'
import { HistoryTools } from '@/app/history/history-tools'
import { IconDotsVertical } from '@tabler/icons-react'
import { RoomButton } from './room-button'
import { RoomDrawer } from './room-drawer'
import { HeaderMoreActionsDrawer } from './header-more-actions-drawer'
import type { TopHeaderMobileProps } from './top-header.types'

export function TopHeaderMobile({
  catalog,
  dialogs,
  editorInteractionsEnabled,
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  history,
  mobileRoomTriggerId,
  mobileMoreContentId,
  mobileMoreTriggerId,
  startOverDisabled,
  onFloorFinishChange,
  onOpenKeyboardShortcutsFromMobileMore,
  onOpenStartOverFromMobileMore,
  onOpenProjectInfoFromMobileMore,
  onShareSceneUrl,
  onWallFinishChange,
  wallFinishId,
  wallFinishes,
  focusControlById,
}: TopHeaderMobileProps) {
  const isRoomOpen =
    dialogs.isRoomSurfaceOpen && dialogs.roomSurfaceLayout === 'mobile'

  return (
    <div data-top-header-root className="pointer-events-auto">
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
            <RoomButton
              id={mobileRoomTriggerId}
              size="toolbar"
              aria-controls="room-drawer"
              aria-expanded={isRoomOpen}
              onClick={() => {
                dialogs.onRoomSurfaceOpenChange(!isRoomOpen, {
                  layout: 'mobile',
                  returnFocusTarget: 'room-inline',
                })
              }}
            />
          </div>
          <div
            className="flex items-center gap-2 justify-self-end"
            inert={catalog.isCatalogDrawerOpen}
            aria-hidden={catalog.isCatalogDrawerOpen}
          >
            <HistoryTools
              canRedo={history.canRedo}
              canUndo={history.canUndo}
              buttonLabelVisibility="sr-only"
              buttonSize="toolbar-icon"
              editorInteractionsEnabled={editorInteractionsEnabled}
              onRedo={history.onRedo}
              onUndo={history.onUndo}
            />
            <Button
              id={mobileMoreTriggerId}
              type="button"
              variant="secondary"
              size="toolbar-icon"
              aria-label="More actions"
              aria-controls={mobileMoreContentId}
              aria-expanded={dialogs.isMobileMoreOpen}
              aria-haspopup="dialog"
              onClick={() => {
                dialogs.onMobileMoreOpenChange(true, {
                  returnFocusTarget: 'mobile-more',
                })
              }}
            >
              <IconDotsVertical aria-hidden="true" />
            </Button>
          </div>
        </div>
      </div>

      <RoomDrawer
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
        contentId={mobileMoreContentId}
        shareDisabled={!editorInteractionsEnabled}
        startOverDisabled={!editorInteractionsEnabled || startOverDisabled}
        open={dialogs.isMobileMoreOpen}
        onOpenChange={(open) => {
          dialogs.onMobileMoreOpenChange(open, {
            returnFocusTarget: 'mobile-more',
          })
        }}
        onCloseAutoFocus={() => {
          focusControlById(mobileMoreTriggerId)
        }}
        onShareSceneUrl={onShareSceneUrl}
        onOpenKeyboardShortcuts={onOpenKeyboardShortcutsFromMobileMore}
        onOpenStartOver={onOpenStartOverFromMobileMore}
        onOpenProjectInfo={onOpenProjectInfoFromMobileMore}
      />
    </div>
  )
}
