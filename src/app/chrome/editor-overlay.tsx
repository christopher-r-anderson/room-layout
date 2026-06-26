import { useDialogOpen } from '@/core/stores/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import {
  useStartupOverlayActive,
  useAssetError,
  useEditorInteractionsEnabled,
} from '@/core/stores/editor-lifecycle-store'
import { useHasSelection } from '@/core/stores/scene-document-store'
import { CameraTools } from '@/features/camera/camera-tools'
import { DeleteConfirmationDialogHost } from '@/features/selection/delete-confirmation-dialog-host'
import { requestAssetRetry } from '@/core/operations/startup-coordinator'
import { StatusMessage } from './feedback/status-message'
import { InitializationError } from '@/features/startup/initialization-error'
import { InitializationProgress } from '@/features/startup/initialization-progress'
import { Outliner } from '@/features/outliner/outliner'
import { SelectedDetailsPanel } from '@/features/selection/selected-details-panel'
import { FloatingSelectedItemSite } from '@/features/selection/floating-selected-item-site'
import { SelectedItemToolbar } from '@/features/selection/selected-item-toolbar'
import { SelectedDetailsPlaceholder } from '@/features/selection/selected-details-view'
import { TopHeader } from './top-header/top-header'
import { useExclusionRegistry } from '@/shared/layout/overlay-exclusion-context'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'

export function EditorOverlay() {
  const registerExclusionElement = useExclusionRegistry()
  const hasSelection = useHasSelection()
  const assetError = useAssetError()
  const startupOverlayActive = useStartupOverlayActive()
  const interactionsEnabled = useEditorInteractionsEnabled()
  const isCatalogDrawerOpen = useDialogOpen(DIALOG_IDS.catalog)
  const layoutMode = useHeaderLayoutMode()
  const isDesktop = layoutMode === 'desktop'

  return (
    <>
      <div
        className="pointer-events-none fixed inset-2 flex flex-col justify-end gap-2"
        inert={startupOverlayActive}
      >
        <div className="mb-auto">
          <TopHeader
            topHeaderRef={registerExclusionElement('top-header')}
            desktopRoomSidebarRef={registerExclusionElement(
              'desktop-room-sidebar',
            )}
            mobileRoomDrawerRef={registerExclusionElement('mobile-room-drawer')}
          />
        </div>

        {isDesktop && (
          <FloatingSelectedItemSite isCatalogDrawerOpen={isCatalogDrawerOpen} />
        )}

        <div
          className="absolute z-20 pointer-events-auto right-0 top-1/4 -translate-y-1/2"
          ref={registerExclusionElement('camera-tools')}
        >
          <CameraTools
            editorInteractionsEnabled={interactionsEnabled}
            hasSelection={hasSelection}
            displayLabels={isDesktop}
          />
        </div>

        <div className="grid gap-2 md:justify-items-start md:items-end md:grid-cols-2 md:grid-rows-[1fr_auto]">
          <div
            className="pointer-events-auto"
            ref={registerExclusionElement('status')}
          >
            <StatusMessage />
          </div>

          {isDesktop && (
            <div
              ref={registerExclusionElement('outliner')}
              className="md:min-w-80 pointer-events-auto"
            >
              <Outliner />
            </div>
          )}

          <div className="flex flex-col gap-2 pointer-events-auto md:col-start-2 md:row-start-1 md:row-span-2 md:justify-self-end">
            {!isDesktop && hasSelection ? (
              <div className="w-fit">
                <SelectedItemToolbar
                  isCatalogDrawerOpen={isCatalogDrawerOpen}
                />
              </div>
            ) : null}
            {hasSelection ? (
              <SelectedDetailsPanel isCatalogDrawerOpen={isCatalogDrawerOpen} />
            ) : (
              <div
                ref={registerExclusionElement('selected-details')}
                aria-hidden="true"
                className="contents"
              >
                <SelectedDetailsPlaceholder />
              </div>
            )}
          </div>
        </div>
      </div>
      <DeleteConfirmationDialogHost />
      <InitializationProgress />
      {assetError ? (
        <InitializationError
          errorKind={assetError.kind}
          errorMessage={assetError.message}
          onRetry={requestAssetRetry}
        />
      ) : null}
    </>
  )
}
