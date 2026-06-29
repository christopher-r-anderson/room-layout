import { Toolbar } from '@base-ui/react/toolbar'
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
import { topHeaderFocusRegistry } from './top-header-focus'
import type { TopHeaderDesktopProps } from './top-header.types'
import { TopHeaderSurface } from './top-header-surface'

export function TopHeaderDesktop({
  desktopRoomSidebarRef,
  editorInteractionsEnabled,
  history,
  isRoomSurfaceOpen,
  isKeyboardShortcutsOpen,
  isProjectInfoOpen,
  startOverDisabled,
  topHeaderRef,
}: TopHeaderDesktopProps) {
  return (
    <>
      <Toolbar.Root
        ref={topHeaderRef}
        data-top-header-root
        aria-label="Header actions"
        className="pointer-events-auto flex flex-wrap items-center justify-between gap-x-0 gap-y-2"
      >
        <TopHeaderSurface>
          <CatalogDrawer
            triggerButton={<Toolbar.Button render={<CatalogAddButton />} />}
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Toolbar.Button
                  render={
                    <Button
                      ref={topHeaderFocusRegistry.register('top-header-room')}
                      type="button"
                      variant="secondary"
                      size="toolbar"
                      className="pointer-events-auto"
                      aria-controls="room-surface"
                      aria-expanded={isRoomSurfaceOpen}
                      onClick={() => {
                        topHeaderDialogOpenChange.roomSurface(
                          !isRoomSurfaceOpen,
                        )
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
              }
            />
            <TooltipContent side="bottom">
              {ROOM_TRIGGER_TOOLTIP}
            </TooltipContent>
          </Tooltip>
        </TopHeaderSurface>

        <TopHeaderSurface>
          <HistoryTools
            canRedo={history.canRedo}
            canUndo={history.canUndo}
            buttonSize="toolbar"
            editorInteractionsEnabled={editorInteractionsEnabled}
          />
          <StartOverButton
            buttonRef={topHeaderFocusRegistry.register('top-header-start-over')}
            disabled={!editorInteractionsEnabled || startOverDisabled}
            disabledMessage={
              !editorInteractionsEnabled
                ? 'Editor interactions are unavailable while loading'
                : 'Scene already matches defaults'
            }
            size="toolbar"
          />
        </TopHeaderSurface>

        <TopHeaderSurface>
          <Tooltip>
            <TooltipTrigger
              render={
                <Toolbar.Button
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="toolbar-icon"
                      aria-controls="keyboard-shortcuts-dialog"
                      aria-haspopup="dialog"
                      aria-expanded={isKeyboardShortcutsOpen}
                      aria-label="Keyboard shortcuts"
                      onClick={() => {
                        topHeaderDialogOpenChange.keyboardShortcuts(true)
                      }}
                    >
                      <IconKeyboard aria-hidden="true" />
                      <span className="sr-only">Keyboard shortcuts</span>
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">Keyboard shortcuts</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger
              render={
                <Toolbar.Button
                  render={
                    <Button
                      type="button"
                      variant="outline"
                      size="toolbar-icon"
                      aria-controls="project-info-dialog"
                      aria-haspopup="dialog"
                      aria-expanded={isProjectInfoOpen}
                      aria-label="Open project and asset info"
                      onClick={() => {
                        topHeaderDialogOpenChange.projectInfo(true)
                      }}
                    >
                      <IconInfoCircle aria-hidden="true" />
                      <span className="sr-only">
                        Open project and asset info
                      </span>
                    </Button>
                  }
                />
              }
            />
            <TooltipContent side="bottom">
              Project and asset info
            </TooltipContent>
          </Tooltip>
          <Toolbar.Button
            disabled={!editorInteractionsEnabled}
            render={
              <ShareSceneButton
                className="min-w-26"
                disabled={!editorInteractionsEnabled}
                size="toolbar"
              />
            }
          />
        </TopHeaderSurface>
      </Toolbar.Root>

      <RoomSidebar
        containerRef={desktopRoomSidebarRef}
        open={isRoomSurfaceOpen}
        onClose={() => {
          topHeaderDialogOpenChange.roomSurface(false)
          topHeaderFocusRegistry.focus('top-header-room')
        }}
      />
    </>
  )
}
