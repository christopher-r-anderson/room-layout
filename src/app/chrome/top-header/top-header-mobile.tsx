import { Toolbar } from '@base-ui/react/toolbar'
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
import { topHeaderFocusRegistry } from './top-header-focus'
import type { TopHeaderMobileProps } from './top-header.types'
import { TopHeaderSurface } from './top-header-surface'

export function TopHeaderMobile({
  history,
  mobileRoomDrawerRef,
  isRoomSurfaceOpen,
  isHeaderMoreActionsOpen,
  blockingOverlayOpen,
  startOverDisabled,
  onOpenKeyboardShortcutsFromHeaderMoreActions,
  onOpenStartOverFromHeaderMoreActions,
  onOpenProjectInfoFromHeaderMoreActions,
  topHeaderRef,
}: TopHeaderMobileProps) {
  return (
    <div
      ref={topHeaderRef}
      data-top-header-root
      className="pointer-events-auto"
    >
      <Toolbar.Root
        aria-label="Header actions"
        render={<TopHeaderSurface className="w-full" />}
      >
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
                    className="mr-auto"
                    aria-controls="room-drawer"
                    aria-expanded={isRoomSurfaceOpen}
                    aria-haspopup="dialog"
                    onClick={() => {
                      topHeaderDialogOpenChange.roomSurface(!isRoomSurfaceOpen)
                    }}
                  >
                    <IconHomeCog size={16} aria-hidden="true" />
                    Room
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">{ROOM_TRIGGER_TOOLTIP}</TooltipContent>
        </Tooltip>
        <HistoryTools
          canRedo={history.canRedo}
          canUndo={history.canUndo}
          displayLabels={false}
          buttonSize="toolbar-icon"
        />
        <Tooltip>
          <TooltipTrigger
            render={
              <Toolbar.Button
                render={
                  <Button
                    ref={topHeaderFocusRegistry.register(
                      'top-header-more-actions',
                    )}
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
                }
              />
            }
          />
          <TooltipContent side="bottom">More actions</TooltipContent>
        </Tooltip>
      </Toolbar.Root>

      <RoomDrawer
        contentRef={mobileRoomDrawerRef}
        open={isRoomSurfaceOpen}
        onOpenChange={topHeaderDialogOpenChange.roomSurface}
        onCloseAutoFocus={() => {
          topHeaderFocusRegistry.focus('top-header-room')
        }}
        restoreFocusOnClose={!blockingOverlayOpen}
      />

      <HeaderMoreActionsDrawer
        contentId={HEADER_MORE_ACTIONS_CONTENT_ID}
        startOverDisabled={startOverDisabled}
        open={isHeaderMoreActionsOpen}
        onOpenChange={topHeaderDialogOpenChange.headerMoreActions}
        onCloseAutoFocus={() => {
          topHeaderFocusRegistry.focus('top-header-more-actions')
        }}
        onOpenKeyboardShortcuts={onOpenKeyboardShortcutsFromHeaderMoreActions}
        onOpenStartOver={onOpenStartOverFromHeaderMoreActions}
        onOpenProjectInfo={onOpenProjectInfoFromHeaderMoreActions}
      />
    </div>
  )
}
