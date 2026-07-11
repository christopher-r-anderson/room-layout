import { Toolbar } from '@base-ui/react/toolbar'
import { CatalogDrawer } from '@/features/catalog/catalog-drawer'
import { CatalogAddButton } from '@/features/catalog/catalog-add-button'
import { HistoryTools } from '@/features/history/history-tools'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { IconHomeCog, IconInfoCircle, IconKeyboard } from '@tabler/icons-react'
import { Trans, useLingui } from '@lingui/react/macro'
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
                    aria-label={t`Keyboard shortcuts`}
                    onClick={() => {
                      dialogActions.openDialog(KEYBOARD_SHORTCUTS_DIALOG_ID)
                    }}
                  >
                    <IconKeyboard aria-hidden="true" />
                    <span className="sr-only">
                      <Trans>Keyboard shortcuts</Trans>
                    </span>
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">
            <Trans>Keyboard shortcuts</Trans>
          </TooltipContent>
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
                    aria-label={t`Open project and asset info`}
                    onClick={() => {
                      dialogActions.openDialog(PROJECT_INFO_DIALOG_ID)
                    }}
                  >
                    <IconInfoCircle aria-hidden="true" />
                    <span className="sr-only">
                      <Trans>Open project and asset info</Trans>
                    </span>
                  </Button>
                }
              />
            }
          />
          <TooltipContent side="bottom">
            <Trans>Project and asset info</Trans>
          </TooltipContent>
        </Tooltip>
        <Toolbar.Button
          render={<ShareSceneButton className="min-w-26" size="toolbar" />}
        />
      </TopHeaderSurface>
    </Toolbar.Root>
  )
}
