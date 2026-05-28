import { Button } from '@/components/ui/button'
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer'
import {
  IconHomeCog,
  IconInfoCircle,
  IconKeyboard,
  IconRotate2,
} from '@tabler/icons-react'

export function HeaderMoreActionsDrawer({
  contentId,
  startOverDisabled,
  onOpenChange,
  onOpenEnvironment,
  onOpenKeyboardShortcuts,
  onOpenStartOver,
  onOpenProjectInfo,
  onCloseAutoFocus,
  open,
}: {
  contentId: string
  startOverDisabled: boolean
  onOpenChange: (open: boolean) => void
  onOpenEnvironment: () => void
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
            Open scene dialogs and reference information.
          </DrawerDescription>
        </DrawerHeader>

        <div className="grid gap-2 px-4 pb-4">
          <Button
            type="button"
            variant="secondary"
            size="toolbar"
            className="justify-start"
            onClick={onOpenEnvironment}
          >
            <IconHomeCog aria-hidden="true" />
            <span>Environment</span>
          </Button>
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
