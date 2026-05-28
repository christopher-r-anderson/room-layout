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
  newSceneDisabled,
  onOpenChange,
  onOpenEnvironment,
  onOpenKeyboardShortcuts,
  onOpenNewScene,
  onOpenProjectInfo,
  onCloseAutoFocus,
  open,
}: {
  newSceneDisabled: boolean
  onOpenChange: (open: boolean) => void
  onOpenEnvironment: () => void
  onOpenKeyboardShortcuts: () => void
  onOpenNewScene: () => void
  onOpenProjectInfo: () => void
  onCloseAutoFocus?: () => void
  open: boolean
}) {
  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)

        if (!nextOpen) {
          queueMicrotask(() => {
            onCloseAutoFocus?.()
          })
        }
      }}
    >
      <DrawerContent>
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
            disabled={newSceneDisabled}
            onClick={onOpenNewScene}
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
