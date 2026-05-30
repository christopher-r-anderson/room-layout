import { CatalogDrawer } from '@/app/catalog/catalog-drawer'
import { CatalogAddButton } from '@/app/catalog/catalog-add-button'
import { HistoryTools } from '@/app/history/history-tools'
import { KeyboardShortcutsDialog } from '@/app/keyboard/keyboard-shortcuts-help'
import { ProjectInfoDialog } from '@/app/project-info/project-info-dialog'
import { IconInfoCircle, IconKeyboard } from '@tabler/icons-react'
import { RoomButton } from './room-button'
import { RoomSidebar } from './room-sidebar'
import { StartOverButton } from './start-over-button'
import { ShareSceneButton } from './share-scene-button'
import type { TopHeaderDesktopProps } from './top-header.types'

export function TopHeaderDesktop({
  catalog,
  desktopRoomSidebarRef,
  desktopRoomTriggerId,
  dialogs,
  desktopInfoTriggerId,
  desktopKeyboardTriggerId,
  editorInteractionsEnabled,
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  history,
  startOverDisabled,
  startOverTriggerId,
  topHeaderRef,
  onFloorFinishChange,
  onShareSceneUrl,
  onWallFinishChange,
  wallFinishId,
  wallFinishes,
}: TopHeaderDesktopProps) {
  const isRoomOpen =
    dialogs.isRoomSurfaceOpen && dialogs.roomSurfaceLayout === 'desktop'

  return (
    <>
      <div
        ref={topHeaderRef}
        data-top-header-root
        className="pointer-events-auto flex flex-wrap items-center justify-between gap-x-0 gap-y-2"
      >
        <div
          role="toolbar"
          aria-label="Scene building actions"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/75 p-2 backdrop-blur-[2px]"
        >
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
            id={desktopRoomTriggerId}
            size="toolbar"
            aria-controls="room-surface"
            aria-expanded={isRoomOpen}
            onClick={() => {
              dialogs.onRoomSurfaceOpenChange(!isRoomOpen, {
                layout: 'desktop',
                returnFocusTarget: 'room-inline',
              })
            }}
            onKeyDown={(event) => {
              if (event.key !== 'Escape' || !isRoomOpen) {
                return
              }

              event.preventDefault()
              dialogs.onRoomSurfaceOpenChange(false)
            }}
          />
        </div>

        <div
          role="toolbar"
          aria-label="History and scene actions"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/75 p-2 backdrop-blur-[2px]"
        >
          <HistoryTools
            canRedo={history.canRedo}
            canUndo={history.canUndo}
            buttonLabelVisibility="always"
            buttonSize="toolbar"
            editorInteractionsEnabled={editorInteractionsEnabled}
            onRedo={history.onRedo}
            onUndo={history.onUndo}
          />
          <StartOverButton
            buttonId={startOverTriggerId}
            disabled={!editorInteractionsEnabled || startOverDisabled}
            disabledMessage={
              !editorInteractionsEnabled
                ? 'Editor interactions are unavailable while loading'
                : 'Scene already matches defaults'
            }
            labelVisibility="always"
            onOpenStartOverDialog={() => {
              dialogs.onOpenStartOverDialog({
                returnFocusTarget: 'start-over-inline',
              })
            }}
            size="toolbar"
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-background/75 p-2 backdrop-blur-[2px]">
          <div
            className="flex items-center justify-end gap-2"
            inert={catalog.isCatalogDrawerOpen}
            aria-hidden={catalog.isCatalogDrawerOpen}
          >
            <KeyboardShortcutsDialog
              open={dialogs.isKeyboardShortcutsDialogOpen}
              onOpenChange={dialogs.onKeyboardShortcutsDialogOpenChange}
              triggerButton={
                <button
                  id={desktopKeyboardTriggerId}
                  type="button"
                  aria-controls="keyboard-shortcuts-dialog"
                  aria-haspopup="dialog"
                  aria-label="Keyboard shortcuts"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <IconKeyboard size={20} aria-hidden="true" />
                  <span className="sr-only">Keyboard shortcuts</span>
                </button>
              }
            />
            <ProjectInfoDialog
              open={dialogs.isInfoDialogOpen}
              onOpenChange={dialogs.onInfoDialogOpenChange}
              triggerButton={
                <button
                  id={desktopInfoTriggerId}
                  type="button"
                  aria-controls="project-info-dialog"
                  aria-haspopup="dialog"
                  aria-label="Open project and asset info"
                  className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
                >
                  <IconInfoCircle size={20} aria-hidden="true" />
                  <span className="sr-only">Open project and asset info</span>
                </button>
              }
            />
            <ShareSceneButton
              disabled={!editorInteractionsEnabled}
              labelVisibility="always"
              onShareSceneUrl={onShareSceneUrl}
              size="toolbar"
            />
          </div>
        </div>
      </div>

      <RoomSidebar
        containerRef={desktopRoomSidebarRef}
        open={isRoomOpen}
        onClose={() => {
          dialogs.onRoomSurfaceOpenChange(false)
          queueMicrotask(() => {
            document.getElementById(desktopRoomTriggerId)?.focus()
          })
        }}
        floorFinishId={floorFinishId}
        floorFinishLoading={floorFinishLoading}
        floorFinishes={floorFinishes}
        onFloorFinishChange={onFloorFinishChange}
        wallFinishId={wallFinishId}
        wallFinishes={wallFinishes}
        onWallFinishChange={onWallFinishChange}
      />
    </>
  )
}
