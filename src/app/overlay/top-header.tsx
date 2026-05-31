import { useEffect, useId } from 'react'
import { KeyboardShortcutsDialog } from '@/app/keyboard/keyboard-shortcuts-help'
import { ProjectInfoDialog } from '@/app/project-info/project-info-dialog'
import { StartOverConfirmationDialog } from '@/app/selection/start-over-confirmation-dialog'
import { useHeaderLayoutMode } from './use-header-layout-mode'
import { TopHeaderDesktop } from './top-header-desktop'
import { TopHeaderMobile } from './top-header-mobile'
import type { TopHeaderProps } from './top-header.types'
import type {
  DialogOpenOptions,
  DialogReturnFocusTarget,
} from './use-dialog-state'

const HEADER_CONTROL_SELECTOR =
  'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'

function isEnabledHeaderControl(element: HTMLElement) {
  if (element.matches('[disabled], [aria-disabled="true"]')) {
    return false
  }

  if (element.closest('[aria-hidden="true"], [inert]')) {
    return false
  }

  return true
}

function findHeaderFocusFallback(target: HTMLElement) {
  const headerRoot = target.closest<HTMLElement>('[data-top-header-root]')

  if (!headerRoot) {
    return null
  }

  const controls = Array.from(
    headerRoot.querySelectorAll<HTMLElement>(HEADER_CONTROL_SELECTOR),
  )

  if (controls.length === 0) {
    return null
  }

  const targetIndex = controls.indexOf(target)

  if (targetIndex === -1) {
    return controls.find(isEnabledHeaderControl) ?? null
  }

  for (let index = targetIndex + 1; index < controls.length; index += 1) {
    const candidate = controls[index]

    if (isEnabledHeaderControl(candidate)) {
      return candidate
    }
  }

  for (let index = targetIndex - 1; index >= 0; index -= 1) {
    const candidate = controls[index]

    if (isEnabledHeaderControl(candidate)) {
      return candidate
    }
  }

  return null
}

function focusControlById(id: string) {
  queueMicrotask(() => {
    const element = document.getElementById(id)

    if (!(element instanceof HTMLElement)) {
      return
    }

    if (isEnabledHeaderControl(element)) {
      element.focus()
      return
    }

    findHeaderFocusFallback(element)?.focus()
  })
}

export function TopHeader({
  dialogs,
  onLayoutModeChange,
  topHeaderRef,
  desktopRoomSidebarRef,
  mobileRoomDrawerRef,
  ...props
}: TopHeaderProps) {
  const layoutMode = useHeaderLayoutMode()
  const mobileRoomTriggerId = useId()
  const mobileMoreContentId = useId()
  const mobileMoreTriggerId = useId()
  const desktopRoomTriggerId = useId()
  const desktopInfoTriggerId = useId()
  const desktopKeyboardTriggerId = useId()
  const startOverTriggerId = useId()

  useEffect(() => {
    onLayoutModeChange?.(layoutMode)
  }, [layoutMode, onLayoutModeChange])

  const focusReturnTarget = (target: DialogReturnFocusTarget) => {
    if (target === 'mobile-more') {
      focusControlById(mobileMoreTriggerId)
      return
    }

    if (target === 'keyboard-inline') {
      focusControlById(desktopKeyboardTriggerId)
      return
    }

    if (target === 'info-inline') {
      focusControlById(desktopInfoTriggerId)
      return
    }

    if (target === 'room-inline') {
      focusControlById(
        layoutMode === 'mobile' ? mobileRoomTriggerId : desktopRoomTriggerId,
      )
      return
    }

    if (target === 'start-over-inline') {
      focusControlById(startOverTriggerId)
    }
  }

  const focusActiveReturnTarget = () => {
    if (dialogs.returnFocusTarget) {
      focusReturnTarget(dialogs.returnFocusTarget)
    }
  }

  const openDialogFromMore = (
    open: (options?: DialogOpenOptions) => unknown,
    returnFocusTarget: DialogReturnFocusTarget,
  ) => {
    dialogs.onMobileMoreOpenChange(false, { returnFocusTarget: 'mobile-more' })

    queueMicrotask(() => {
      open({ returnFocusTarget })
    })
  }

  return (
    <>
      {layoutMode === 'mobile' ? (
        <TopHeaderMobile
          {...props}
          dialogs={dialogs}
          topHeaderRef={topHeaderRef}
          mobileRoomDrawerRef={mobileRoomDrawerRef}
          mobileRoomTriggerId={mobileRoomTriggerId}
          mobileMoreContentId={mobileMoreContentId}
          mobileMoreTriggerId={mobileMoreTriggerId}
          onOpenKeyboardShortcutsFromMobileMore={() => {
            openDialogFromMore((options) => {
              dialogs.onKeyboardShortcutsDialogOpenChange(true, options)
            }, 'mobile-more')
          }}
          onOpenStartOverFromMobileMore={() => {
            openDialogFromMore(dialogs.onOpenStartOverDialog, 'mobile-more')
          }}
          onOpenProjectInfoFromMobileMore={() => {
            openDialogFromMore((options) => {
              dialogs.onInfoDialogOpenChange(true, options)
            }, 'mobile-more')
          }}
          focusControlById={focusControlById}
        />
      ) : (
        <TopHeaderDesktop
          {...props}
          dialogs={dialogs}
          topHeaderRef={topHeaderRef}
          desktopRoomSidebarRef={desktopRoomSidebarRef}
          desktopRoomTriggerId={desktopRoomTriggerId}
          desktopInfoTriggerId={desktopInfoTriggerId}
          desktopKeyboardTriggerId={desktopKeyboardTriggerId}
          startOverTriggerId={startOverTriggerId}
        />
      )}

      {layoutMode === 'mobile' ? (
        <>
          <KeyboardShortcutsDialog
            open={dialogs.isKeyboardShortcutsDialogOpen}
            onOpenChange={(open) => {
              dialogs.onKeyboardShortcutsDialogOpenChange(open)

              if (!open) {
                focusActiveReturnTarget()
              }
            }}
            triggerButton={null}
          />

          <ProjectInfoDialog
            open={dialogs.isInfoDialogOpen}
            onOpenChange={(open) => {
              dialogs.onInfoDialogOpenChange(open)

              if (!open) {
                focusActiveReturnTarget()
              }
            }}
            triggerButton={null}
          />
        </>
      ) : null}

      <StartOverConfirmationDialog
        open={dialogs.isStartOverDialogOpen}
        onClose={() => {
          dialogs.onCloseStartOverDialog()
          focusActiveReturnTarget()
        }}
        onConfirm={() => {
          dialogs.onConfirmStartOver()
          focusActiveReturnTarget()
        }}
      />
    </>
  )
}
