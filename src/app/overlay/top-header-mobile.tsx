import { Button } from '@/components/ui/button'
import { CatalogDrawer } from '@/app/catalog/catalog-drawer'
import { CatalogAddButton } from '@/app/catalog/catalog-add-button'
import { HistoryTools } from '@/app/history/history-tools'
import { IconDotsVertical } from '@tabler/icons-react'
import { EnvironmentDrawer } from './environment-drawer'
import { HeaderMoreActionsDrawer } from './header-more-actions-drawer'
import { ShareSceneButton } from './share-scene-button'
import type { TopHeaderMobileProps } from './top-header.types'

export function TopHeaderMobile({
  catalog,
  dialogs,
  editorInteractionsEnabled,
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  history,
  mobileMoreContentId,
  mobileMoreTriggerId,
  startOverDisabled,
  onFloorFinishChange,
  onOpenEnvironmentFromMobileMore,
  onOpenKeyboardShortcutsFromMobileMore,
  onOpenStartOverFromMobileMore,
  onOpenProjectInfoFromMobileMore,
  onShareSceneUrl,
  onWallFinishChange,
  wallFinishId,
  wallFinishes,
  focusControlById,
}: TopHeaderMobileProps) {
  return (
    <div data-top-header-root className="pointer-events-auto">
      <div
        role="toolbar"
        aria-label="Mobile header actions"
        className="rounded-xl border border-border/70 bg-background/75 p-2 backdrop-blur-[2px]"
      >
        <div className="flex items-center gap-2">
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
          <div
            className="ml-auto flex items-center gap-2"
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
            <ShareSceneButton
              disabled={!editorInteractionsEnabled}
              labelVisibility="sr-only"
              onShareSceneUrl={onShareSceneUrl}
              size="toolbar-icon"
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

      <EnvironmentDrawer
        open={
          dialogs.isEnvironmentDialogOpen &&
          dialogs.environmentDialogLayout === 'mobile'
        }
        onOpenChange={(open) => {
          dialogs.onEnvironmentDialogOpenChange(open, {
            layout: 'mobile',
            returnFocusTarget: 'mobile-more',
          })
        }}
        onCloseAutoFocus={() => {
          focusControlById(mobileMoreTriggerId)
        }}
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
        onOpenEnvironment={onOpenEnvironmentFromMobileMore}
        onOpenKeyboardShortcuts={onOpenKeyboardShortcutsFromMobileMore}
        onOpenStartOver={onOpenStartOverFromMobileMore}
        onOpenProjectInfo={onOpenProjectInfoFromMobileMore}
      />
    </div>
  )
}
