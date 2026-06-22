import { CatalogDrawer } from '@/features/catalog/catalog-drawer'
import { CatalogAddButton } from '@/features/catalog/catalog-add-button'
import { HistoryTools } from '@/features/history/history-tools'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { IconHomeCog, IconInfoCircle, IconKeyboard } from '@tabler/icons-react'
import { ROOM_TRIGGER_TOOLTIP } from '@/features/room-surface/room-copy'
import { RoomSidebar } from '@/features/room-surface/room-sidebar'
import { StartOverButton } from './start-over-button'
import { ShareSceneButton } from './share-scene-button'
import { topHeaderDialogOpenChange } from './top-header-dialog-bindings'
import { headerFocusRegistry } from './header-focus-registry'
import type { TopHeaderDesktopProps } from './top-header.types'

export function TopHeaderDesktop({
  isCatalogDrawerOpen,
  desktopRoomSidebarRef,
  editorInteractionsEnabled,
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  history,
  isRoomSurfaceOpen,
  isKeyboardShortcutsOpen,
  isProjectInfoOpen,
  onOpenStartOverDialog,
  startOverDisabled,
  topHeaderRef,
  onFloorFinishChange,
  onShareSceneUrl,
  onWallFinishChange,
  wallFinishId,
  wallFinishes,
}: TopHeaderDesktopProps) {
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
                    className="pointer-events-auto"
                    aria-controls="room-surface"
                    aria-expanded={isRoomSurfaceOpen}
                    onClick={() => {
                      topHeaderDialogOpenChange.roomSurface(!isRoomSurfaceOpen)
                    }}
                    onKeyDown={(event) => {
                      if (event.key !== 'Escape' || !isRoomSurfaceOpen) {
                        return
                      }

                      event.preventDefault()
                      topHeaderDialogOpenChange.roomSurface(false)
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
          role="toolbar"
          aria-label="History and scene actions"
          className="flex flex-wrap items-center gap-2 rounded-xl border border-border/70 bg-background/75 p-2 backdrop-blur-[2px]"
        >
          <HistoryTools
            canRedo={history.canRedo}
            canUndo={history.canUndo}
            buttonSize="toolbar"
            editorInteractionsEnabled={editorInteractionsEnabled}
          />
          <StartOverButton
            buttonRef={headerFocusRegistry.register('top-header-start-over')}
            disabled={!editorInteractionsEnabled || startOverDisabled}
            disabledMessage={
              !editorInteractionsEnabled
                ? 'Editor interactions are unavailable while loading'
                : 'Scene already matches defaults'
            }
            onOpenStartOverDialog={() => {
              onOpenStartOverDialog()
            }}
            size="toolbar"
          />
        </div>

        <div className="rounded-xl border border-border/70 bg-background/75 p-2 backdrop-blur-[2px]">
          <div
            className="flex items-center justify-end gap-2"
            inert={isCatalogDrawerOpen}
          >
            <button
              type="button"
              aria-controls="keyboard-shortcuts-dialog"
              aria-haspopup="dialog"
              aria-expanded={isKeyboardShortcutsOpen}
              aria-label="Keyboard shortcuts"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              onClick={() => {
                topHeaderDialogOpenChange.keyboardShortcuts(true)
              }}
            >
              <IconKeyboard size={20} aria-hidden="true" />
              <span className="sr-only">Keyboard shortcuts</span>
            </button>
            <button
              type="button"
              aria-controls="project-info-dialog"
              aria-haspopup="dialog"
              aria-expanded={isProjectInfoOpen}
              aria-label="Open project and asset info"
              className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-input bg-background shadow-xs transition-[color,box-shadow] outline-none hover:bg-accent hover:text-accent-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50"
              onClick={() => {
                topHeaderDialogOpenChange.projectInfo(true)
              }}
            >
              <IconInfoCircle size={20} aria-hidden="true" />
              <span className="sr-only">Open project and asset info</span>
            </button>
            <ShareSceneButton
              className="min-w-26"
              disabled={!editorInteractionsEnabled}
              onShareSceneUrl={onShareSceneUrl}
              size="toolbar"
            />
          </div>
        </div>
      </div>

      <RoomSidebar
        containerRef={desktopRoomSidebarRef}
        open={isRoomSurfaceOpen}
        onClose={() => {
          topHeaderDialogOpenChange.roomSurface(false)
          headerFocusRegistry.focus('top-header-room')
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
