import { useEffect } from 'react'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
import { TopHeaderDesktop } from './top-header-desktop'
import { TopHeaderMobile } from './top-header-mobile'
import { TopHeaderDialogs } from './top-header-dialogs'
import { dialogActions, useDialogOpen } from '@/core/stores/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'

export function TopHeader() {
  const layoutMode = useHeaderLayoutMode()
  const isHeaderMoreActionsOpen = useDialogOpen(DIALOG_IDS.headerMoreActions)

  // More actions is mobile-only and blocking. It has no desktop equivalent, so
  // if the viewport widens while it is open we close it to avoid leaving the
  // blocking-overlay state active with no surface able to dismiss it.
  useEffect(() => {
    if (layoutMode === 'desktop' && isHeaderMoreActionsOpen) {
      dialogActions.setDialogOpen(DIALOG_IDS.headerMoreActions, false)
    }
  }, [layoutMode, isHeaderMoreActionsOpen])

  return (
    <>
      {layoutMode === 'mobile' ? <TopHeaderMobile /> : <TopHeaderDesktop />}
      <TopHeaderDialogs />
    </>
  )
}
