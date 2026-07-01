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
import { ShareSceneButton } from './share-scene-button'

export function HeaderMoreActionsDrawer({
  contentId,
  startOverDisabled,
  onOpenChange,
  onOpenKeyboardShortcuts,
  onOpenStartOver,
  onOpenProjectInfo,
  onCloseAutoFocus,
  open,
}: {
  contentId: string
  startOverDisabled: boolean
  onOpenChange: (open: boolean) => void
  onOpenKeyboardShortcuts: () => void
  onOpenStartOver: () => void
  onOpenProjectInfo: () => void
  onCloseAutoFocus?: () => void
  open: boolean
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} autoFocus>
      <DrawerContent
        id={contentId}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseAutoFocus?.()
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
            onClick={onOpenStartOver}
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
            onClick={onOpenKeyboardShortcuts}
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
            onClick={onOpenProjectInfo}
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
