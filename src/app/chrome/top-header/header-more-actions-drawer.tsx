import { Button } from '@/shared/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/ui/drawer'
import { IconInfoCircle, IconKeyboard, IconRotate2 } from '@tabler/icons-react'
import { Trans } from '@lingui/react/macro'
import { dialogActions, useDialogOpen } from '@/core/stores/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
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
  const dispatch = useCommandDispatch()
  const open = useDialogOpen(DIALOG_IDS.headerMoreActions)
  const startOverDisabled = useSceneIsAtDefaults()

  // Hand off from More actions to another surface: close the drawer first, then
  // open the target on the next microtask so the drawer's focus handling settles
  // before the next surface traps focus.
  const openFromMoreActions = (openTarget: () => void) => {
    dialogActions.setDialogOpen(DIALOG_IDS.headerMoreActions, false)
    queueMicrotask(openTarget)
  }

  return (
    <Drawer
      open={open}
      onOpenChange={(next) =>
        dialogActions.setDialogOpen(DIALOG_IDS.headerMoreActions, next)
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
          <Button
            type="button"
            variant="secondary"
            size="toolbar"
            className="justify-start"
            disabled={startOverDisabled}
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
          <Button
            type="button"
            variant="secondary"
            size="toolbar"
            className="justify-start"
            onClick={() => {
              openFromMoreActions(() => {
                dialogActions.openDialog(DIALOG_IDS.keyboardShortcuts)
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
                dialogActions.openDialog(DIALOG_IDS.projectInfo)
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
