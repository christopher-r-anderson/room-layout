import { Toolbar } from '@base-ui/react/toolbar'
import { CatalogDrawer } from '@/features/catalog/catalog-drawer'
import { CatalogAddButton } from '@/features/catalog/catalog-add-button'
import { HistoryTools } from '@/features/history/history-tools'
import { Button } from '@/shared/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/shared/ui/tooltip'
import { IconHomeCog, IconInfoCircle, IconKeyboard } from '@tabler/icons-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { RoomSidebar } from '@/features/room-surface/room-sidebar'
import { StartOverButton } from './start-over-button'
import { ShareSceneButton } from './share-scene-button'
import { topHeaderDialogOpenChange } from './top-header-dialog-bindings'
import { topHeaderFocusRegistry } from './top-header-focus'
import type { TopHeaderDesktopProps } from './top-header.types'
import { TopHeaderSurface } from './top-header-surface'
import { useExclusionRegistry } from '@/shared/layout/overlay-exclusion-context'

export function TopHeaderDesktop({
  history,
  isRoomSurfaceOpen,
  isKeyboardShortcutsOpen,
  isProjectInfoOpen,
  startOverDisabled,
}: TopHeaderDesktopProps) {
  const { t } = useLingui()
  const registerExclusionElement = useExclusionRegistry()

  return (
    <>
      <Toolbar.Root
        ref={registerExclusionElement('top-header')}
        data-top-header-root
        aria-label={t`Header actions`}
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
            buttonRef={topHeaderFocusRegistry.register('top-header-start-over')}
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
                        topHeaderDialogOpenChange.keyboardShortcuts(true)
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
                        topHeaderDialogOpenChange.projectInfo(true)
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

      <RoomSidebar
        ref={registerExclusionElement('room-surface')}
        open={isRoomSurfaceOpen}
        onClose={() => {
          topHeaderDialogOpenChange.roomSurface(false)
          topHeaderFocusRegistry.focus('top-header-room')
        }}
      />
    </>
  )
}
