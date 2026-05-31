import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import { IconInfoCircle, IconKeyboard, IconRotate2 } from '@tabler/icons-react'
import { ShareSceneButton } from './share-scene-button'

export function HeaderMoreActionsDrawer({
  contentId,
  shareDisabled,
  startOverDisabled,
  onOpenChange,
  onShareSceneUrl,
  onOpenKeyboardShortcuts,
  onOpenStartOver,
  onOpenProjectInfo,
  onCloseAutoFocus,
  open,
}: {
  contentId: string
  shareDisabled: boolean
  startOverDisabled: boolean
  onOpenChange: (open: boolean) => void
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
  onOpenKeyboardShortcuts: () => void
  onOpenStartOver: () => void
  onOpenProjectInfo: () => void
  onCloseAutoFocus?: () => void
  open: boolean
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
      }}
    >
      <DrawerContent
        id={contentId}
        onCloseAutoFocus={(event) => {
          event.preventDefault()
          onCloseAutoFocus?.()
        }}
      >
        <DrawerHeader>
          <DrawerTitle>More actions</DrawerTitle>
          <DrawerDescription>
            Share, start over, or reference help.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-2 px-4 pb-4">
          <ShareSceneButton
            disabled={shareDisabled}
            labelVisibility="always"
            onShareSceneUrl={onShareSceneUrl}
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
            <span>Start Over</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="toolbar"
            className="justify-start"
            onClick={onOpenKeyboardShortcuts}
          >
            <IconKeyboard aria-hidden="true" />
            <span>Keyboard shortcuts</span>
          </Button>
          <Button
            type="button"
            variant="secondary"
            size="toolbar"
            className="justify-start"
            onClick={onOpenProjectInfo}
          >
            <IconInfoCircle aria-hidden="true" />
            <span>Project info</span>
          </Button>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
