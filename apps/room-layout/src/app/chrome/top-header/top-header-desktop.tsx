import { Toolbar } from '@base-ui/react/toolbar'
import { CatalogDrawer } from '@/features/catalog/catalog-drawer'
import { CatalogAddButton } from '@/features/catalog/catalog-add-button'
import { HistoryTools } from '@/features/history/history-tools'
import { ToolbarPopupButton } from '@/shared/ui/toolbar-button'
import { IconHomeCog, IconInfoCircle, IconKeyboard } from '@tabler/icons-react'
import { useLingui } from '@lingui/react/macro'
import { StartOverButton } from './start-over-button'
import { ShareSceneButton } from './share-scene-button'
import { dialogActions, useDialogOpen } from '@/core/stores/dialog-store'
import { ROOM_SURFACE_DIALOG_ID } from '@/features/room-surface/room-surface-dialog-definition'
import { KEYBOARD_SHORTCUTS_DIALOG_ID } from '@/features/keyboard/keyboard-shortcuts-dialog-definition'
import { PROJECT_INFO_DIALOG_ID } from '@/features/project-info/project-info-dialog-definition'
import { useHistoryAvailability } from '@/core/operations/history-availability'
import { useSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import { topHeaderFocusRegistry } from './top-header-focus'
import { TopHeaderSurface } from './top-header-surface'
import { useEditorRectRegistry } from '@/core/layout/editor-rects-context'

export function TopHeaderDesktop() {
  const { t } = useLingui()
  const registerRect = useEditorRectRegistry()
  const history = useHistoryAvailability()
  const startOverDisabled = useSceneIsAtDefaults()
  const isRoomSurfaceOpen = useDialogOpen(ROOM_SURFACE_DIALOG_ID)
  const isKeyboardShortcutsOpen = useDialogOpen(KEYBOARD_SHORTCUTS_DIALOG_ID)
  const isProjectInfoOpen = useDialogOpen(PROJECT_INFO_DIALOG_ID)

  return (
    <Toolbar.Root
      ref={registerRect('top-header')}
      aria-label={t`Editor actions`}
      className="pointer-events-auto flex flex-wrap items-center justify-between gap-x-0 gap-y-2"
    >
      <TopHeaderSurface>
        <CatalogDrawer
          triggerButton={<Toolbar.Button render={<CatalogAddButton />} />}
        />
        <ToolbarPopupButton
          buttonRef={topHeaderFocusRegistry.register('top-header-room')}
          controlsId="room-surface"
          expanded={isRoomSurfaceOpen}
          label={t`Room`}
          icon={<IconHomeCog />}
          size="toolbar"
          className="pointer-events-auto"
          tooltipSide="bottom"
          tooltip={t`Adjust wall, floor, and lighting`}
          onClick={() => {
            dialogActions.setDialogOpen(
              ROOM_SURFACE_DIALOG_ID,
              !isRoomSurfaceOpen,
            )
          }}
          onKeyDown={(event) => {
            if (event.key !== 'Escape' || !isRoomSurfaceOpen) {
              return
            }

            event.preventDefault()
            dialogActions.setDialogOpen(ROOM_SURFACE_DIALOG_ID, false)
          }}
        />
      </TopHeaderSurface>

      <TopHeaderSurface>
        <HistoryTools
          canRedo={history.canRedo}
          canUndo={history.canUndo}
          buttonSize="toolbar"
        />
        <StartOverButton
          disabled={startOverDisabled}
          disabledMessage={t`Scene already matches defaults`}
          size="toolbar"
        />
      </TopHeaderSurface>

      <TopHeaderSurface>
        <ToolbarPopupButton
          controlsId="keyboard-shortcuts-dialog"
          expanded={isKeyboardShortcutsOpen}
          popupType="dialog"
          label={t`Keyboard shortcuts`}
          showLabel={false}
          icon={<IconKeyboard />}
          variant="outline"
          size="toolbar-icon"
          tooltipSide="bottom"
          tooltip={t`Keyboard shortcuts`}
          onClick={() => {
            dialogActions.openDialog(KEYBOARD_SHORTCUTS_DIALOG_ID)
          }}
        />
        <ToolbarPopupButton
          controlsId="project-info-dialog"
          expanded={isProjectInfoOpen}
          popupType="dialog"
          label={t`Open project and asset info`}
          showLabel={false}
          icon={<IconInfoCircle />}
          variant="outline"
          size="toolbar-icon"
          tooltipSide="bottom"
          tooltip={t`Project and asset info`}
          onClick={() => {
            dialogActions.openDialog(PROJECT_INFO_DIALOG_ID)
          }}
        />
        <Toolbar.Button
          render={<ShareSceneButton className="min-w-26" size="toolbar" />}
        />
      </TopHeaderSurface>
    </Toolbar.Root>
  )
}
