import { Toolbar } from '@base-ui/react/toolbar'
import { Button } from '@/shared/ui/button'
import { CatalogDrawer } from '@/features/catalog/catalog-drawer'
import { CatalogAddButton } from '@/features/catalog/catalog-add-button'
import { HistoryTools } from '@/features/history/history-tools'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { IconDotsVertical, IconHomeCog } from '@tabler/icons-react'
import { RoomDrawer } from '@/features/room-surface/room-drawer'
import { HeaderMoreActionsDrawer } from './header-more-actions-drawer'
import { Trans, useLingui } from '@lingui/react/macro'
import { dialogActions } from '@/core/stores/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import { topHeaderFocusRegistry } from './top-header-focus'
import type { TopHeaderMobileProps } from './top-header.types'
import { TopHeaderSurface } from './top-header-surface'
import { useExclusionRegistry } from '@/shared/layout/overlay-exclusion-context'

/**
 * Stable DOM id for the "More actions" drawer content. It is referenced by the
 * trigger's `aria-controls`, so it must stay a fixed string.
 */
const HEADER_MORE_ACTIONS_CONTENT_ID = 'header-more-actions-content'

export function TopHeaderMobile({
  history,
  isRoomSurfaceOpen,
  isHeaderMoreActionsOpen,
  blockingOverlayOpen,
  startOverDisabled,
  onOpenKeyboardShortcutsFromHeaderMoreActions,
  onOpenStartOverFromHeaderMoreActions,
  onOpenProjectInfoFromHeaderMoreActions,
}: TopHeaderMobileProps) {
  const { t } = useLingui()
  const registerExclusionElement = useExclusionRegistry()

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
                        DIALOG_IDS.roomSurface,
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
                      dialogActions.setDialogOpen(
                        DIALOG_IDS.headerMoreActions,
                        true,
                      )
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
          dialogActions.setDialogOpen(DIALOG_IDS.roomSurface, open)
        }
        onCloseAutoFocus={() => {
          topHeaderFocusRegistry.focus('top-header-room')
        }}
        restoreFocusOnClose={!blockingOverlayOpen}
      />

      <HeaderMoreActionsDrawer
        contentId={HEADER_MORE_ACTIONS_CONTENT_ID}
        startOverDisabled={startOverDisabled}
        open={isHeaderMoreActionsOpen}
        onOpenChange={(open) =>
          dialogActions.setDialogOpen(DIALOG_IDS.headerMoreActions, open)
        }
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
