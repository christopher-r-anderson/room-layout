import { Toolbar } from '@base-ui/react/toolbar'
import { CatalogDrawer } from '@/features/catalog/catalog-drawer'
import { CatalogAddButton } from '@/features/catalog/catalog-add-button'
import { HistoryTools } from '@/features/history/history-tools'
import { ToolbarPopupButton } from '@/shared/ui/toolbar-button'
import { IconDotsVertical, IconHomeCog } from '@tabler/icons-react'
import { RoomDrawer } from '@/features/room-surface/room-drawer'
import {
  HeaderMoreActionsDrawer,
  HEADER_MORE_ACTIONS_CONTENT_ID,
} from './header-more-actions-drawer'
import { useLingui } from '@lingui/react/macro'
import {
  dialogActions,
  useDialogOpen,
  useIsBlockingOverlayOpen,
} from '@/core/stores/dialog-store'
import { ROOM_SURFACE_DIALOG_ID } from '@/features/room-surface/room-surface-dialog-definition'
import { HEADER_MORE_ACTIONS_DIALOG_ID } from './header-more-actions-dialog-definition'
import { useHistoryAvailability } from '@/core/operations/history-availability'
import { topHeaderFocusRegistry } from './top-header-focus'
import { TopHeaderSurface } from './top-header-surface'
import { useEditorRectRegistry } from '@/core/layout/editor-rects-context'

export function TopHeaderMobile() {
  const { t } = useLingui()
  const registerRect = useEditorRectRegistry()
  const history = useHistoryAvailability()
  const isRoomSurfaceOpen = useDialogOpen(ROOM_SURFACE_DIALOG_ID)
  const isHeaderMoreActionsOpen = useDialogOpen(HEADER_MORE_ACTIONS_DIALOG_ID)
  const blockingOverlayOpen = useIsBlockingOverlayOpen()

  return (
    <div ref={registerRect('top-header')} className="pointer-events-auto">
      <Toolbar.Root
        aria-label={t`Editor actions`}
        render={<TopHeaderSurface className="w-full" />}
      >
        <CatalogDrawer
          triggerButton={<Toolbar.Button render={<CatalogAddButton />} />}
        />
        <ToolbarPopupButton
          buttonRef={topHeaderFocusRegistry.register('top-header-room')}
          controlsId="room-drawer"
          expanded={isRoomSurfaceOpen}
          popupType="dialog"
          label={t`Room`}
          icon={<IconHomeCog />}
          size="toolbar"
          className="me-auto"
          tooltipSide="bottom"
          tooltip={t`Adjust wall, floor, and lighting`}
          onClick={() => {
            dialogActions.setDialogOpen(
              ROOM_SURFACE_DIALOG_ID,
              !isRoomSurfaceOpen,
            )
          }}
        />
        <HistoryTools
          canRedo={history.canRedo}
          canUndo={history.canUndo}
          displayLabels={false}
          buttonSize="toolbar-icon"
        />
        <ToolbarPopupButton
          buttonRef={topHeaderFocusRegistry.register('top-header-more-actions')}
          controlsId={HEADER_MORE_ACTIONS_CONTENT_ID}
          expanded={isHeaderMoreActionsOpen}
          popupType="dialog"
          label={t`More actions`}
          showLabel={false}
          icon={<IconDotsVertical />}
          size="toolbar-icon"
          tooltipSide="bottom"
          tooltip={t`More actions`}
          onClick={() => {
            dialogActions.openDialog(HEADER_MORE_ACTIONS_DIALOG_ID)
          }}
        />
      </Toolbar.Root>

      <RoomDrawer
        ref={registerRect('room-surface')}
        open={isRoomSurfaceOpen}
        onOpenChange={(open) =>
          dialogActions.setDialogOpen(ROOM_SURFACE_DIALOG_ID, open)
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
