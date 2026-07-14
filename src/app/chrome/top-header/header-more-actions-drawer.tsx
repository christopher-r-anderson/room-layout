import { useId } from 'react'
import { Button } from '@/shared/ui/button'
import { ariaDisabledButtonClasses } from '@/shared/ui/button-variants'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer'
import { cn } from '@/shared/lib/utils'
import { IconInfoCircle, IconKeyboard, IconRotate2 } from '@tabler/icons-react'
import { Trans, useLingui } from '@lingui/react/macro'
import { dialogActions, useDialogOpen } from '@/core/stores/dialog-store'
import { HEADER_MORE_ACTIONS_DIALOG_ID } from './header-more-actions-dialog-definition'
import { KEYBOARD_SHORTCUTS_DIALOG_ID } from '@/features/keyboard/keyboard-shortcuts-dialog-definition'
import { PROJECT_INFO_DIALOG_ID } from '@/features/project-info/project-info-dialog-definition'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import { ShareSceneButton } from './share-scene-button'
import { topHeaderFocusRegistry } from './top-header-focus'

/**
 * Stable DOM id for the drawer content. The trigger references it via
 * `aria-controls`, so it must stay a fixed string.
 */
export const HEADER_MORE_ACTIONS_CONTENT_ID = 'header-more-actions-content'

export function HeaderMoreActionsDrawer() {
  const { t } = useLingui()
  const dispatch = useCommandDispatch()
  const open = useDialogOpen(HEADER_MORE_ACTIONS_DIALOG_ID)
  const startOverDisabled = useSceneIsAtDefaults()
  const startOverReasonId = useId()

  // Hand off from More actions to another surface: close the drawer first, then
  // open the target on the next microtask so the drawer's focus handling settles
  // before the next surface traps focus.
  const openFromMoreActions = (openTarget: () => void) => {
    dialogActions.setDialogOpen(HEADER_MORE_ACTIONS_DIALOG_ID, false)
    queueMicrotask(openTarget)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) =>
        dialogActions.setDialogOpen(HEADER_MORE_ACTIONS_DIALOG_ID, next)
      }
      autoFocus
    >
      <DrawerContent
        id={HEADER_MORE_ACTIONS_CONTENT_ID}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          topHeaderFocusRegistry.focus('top-header-more-actions')
        }}
      >
        <DrawerHeader>
          <DrawerTitle>
            <Trans>More actions</Trans>
          </DrawerTitle>
          <DrawerDescription>
            <Trans>Share, start over, or reference help.</Trans>
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-2 px-4 pb-4">
          <ShareSceneButton
            size="toolbar"
            variant="secondary"
            className="justify-start"
          />
          {/* Disabled Start Over stays focusable with a visible reason line:
              the drawer has no hover-tooltip channel to explain it. */}
          <div className="grid gap-1">
            <Button
              type="button"
              variant="secondary"
              size="toolbar"
              className={cn('justify-start', ariaDisabledButtonClasses)}
              disabled={startOverDisabled}
              focusableWhenDisabled
              aria-describedby={
                startOverDisabled ? startOverReasonId : undefined
              }
              onClick={() => {
                openFromMoreActions(() => {
                  dispatch({ kind: 'start-over' })
                })
              }}
            >
              <IconRotate2 aria-hidden="true" />
              <span>
                <Trans>Start Over</Trans>
              </span>
            </Button>
            {startOverDisabled ? (
              <p
                id={startOverReasonId}
                className="ps-3 text-xs text-muted-foreground"
              >
                {t`Scene already matches defaults`}
              </p>
            ) : null}
          </div>
          <Button
            type="button"
            variant="secondary"
            size="toolbar"
            className="justify-start"
            onClick={() => {
              openFromMoreActions(() => {
                dialogActions.openDialog(KEYBOARD_SHORTCUTS_DIALOG_ID)
              })
            }}
          >
            <IconKeyboard aria-hidden="true" />
            <span>
              <Trans>Keyboard shortcuts</Trans>
            </span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="toolbar"
            className="justify-start"
            onClick={() => {
              openFromMoreActions(() => {
                dialogActions.openDialog(PROJECT_INFO_DIALOG_ID)
              })
            }}
          >
            <IconInfoCircle aria-hidden="true" />
            <span>
              <Trans>Project info</Trans>
            </span>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
