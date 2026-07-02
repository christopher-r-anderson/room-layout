import { Toolbar } from '@base-ui/react/toolbar'
import { Button } from '@/shared/ui/button'
import { CatalogDrawer } from '@/features/catalog/catalog-drawer'
import { CatalogAddButton } from '@/features/catalog/catalog-add-button'
import { HistoryTools } from '@/features/history/history-tools'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { IconDotsVertical, IconHomeCog } from '@tabler/icons-react'
import { RoomDrawer } from '@/features/room-surface/room-drawer'
import {
  HeaderMoreActionsDrawer,
  HEADER_MORE_ACTIONS_CONTENT_ID,
} from './header-more-actions-drawer'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  dialogActions,
  useDialogOpen,
  useIsBlockingOverlayOpen,
} from '@/core/stores/dialog-store'
import { roomSurfaceDialogId } from '@/features/room-surface/room-surface-dialog-definition'
import { headerMoreActionsDialogId } from './header-more-actions-dialog-definition'
import { useHistoryAvailability } from '@/core/stores/scene-document-store'
import { topHeaderFocusRegistry } from './top-header-focus'
import { TopHeaderSurface } from './top-header-surface'
import { useExclusionRegistry } from '@/shared/layout/overlay-exclusion-context'

export function TopHeaderMobile() {
  const { t } = useLingui()
  const registerExclusionElement = useExclusionRegistry()
  const history = useHistoryAvailability()
  const isRoomSurfaceOpen = useDialogOpen(roomSurfaceDialogId)
  const isHeaderMoreActionsOpen = useDialogOpen(headerMoreActionsDialogId)
  const blockingOverlayOpen = useIsBlockingOverlayOpen()

  return (
    <div
      ref={registerExclusionElement('top-header')}
      data-top-header-root
      className="pointer-events-auto"
    >
      <Toolbar.Root
        aria-label={t`Header actions`}
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
                    className="me-auto"
                    aria-controls="room-drawer"
                    aria-expanded={isRoomSurfaceOpen}
                    aria-haspopup="dialog"
                    onClick={() => {
                      dialogActions.setDialogOpen(
                        roomSurfaceDialogId,
                        !isRoomSurfaceOpen,
                      )
                    }}
                  >
                    <IconHomeCog size={16} aria-hidden="true" />
                    <Trans>Room</Trans>
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">
            <Trans>Adjust wall, floor, and lighting</Trans>
          </TooltipContent>
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
                    aria-label={t`More actions`}
                    aria-controls={HEADER_MORE_ACTIONS_CONTENT_ID}
                    aria-expanded={isHeaderMoreActionsOpen}
                    aria-haspopup="dialog"
                    onClick={() => {
                      dialogActions.openDialog(headerMoreActionsDialogId)
                    }}
                  >
                    <IconDotsVertical aria-hidden="true" />
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">
            <Trans>More actions</Trans>
          </TooltipContent>
        </Tooltip>
      </Toolbar.Root>

      <RoomDrawer
        ref={registerExclusionElement('room-surface')}
        open={isRoomSurfaceOpen}
        onOpenChange={(open) =>
          dialogActions.setDialogOpen(roomSurfaceDialogId, open)
        }
        onCloseAutoFocus={() => {
          topHeaderFocusRegistry.focus('top-header-room')
        }}
        restoreFocusOnClose={!blockingOverlayOpen}
      />

      <HeaderMoreActionsDrawer />
    </div>
  )
}
