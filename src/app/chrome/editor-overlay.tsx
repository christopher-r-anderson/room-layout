import {
  dialogActions,
  useDialogOpen,
  useDialogPayload,
} from '@/editor-state/dialog-store'
import { DIALOG_IDS } from '@/app/dialogs/dialog-registry'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import {
  useStartupLoadingActive,
  useStartupOverlayActive,
  useAssetError,
  useEditorInteractionsEnabled,
} from '@/editor-state/editor-runtime-store'
import { useHasSelection } from '@/editor-state/scene-state-store'
import type { CameraPreset } from '@/scene/scene.types'
import { CameraTools } from '@/features/camera/camera-tools'
import { DeleteConfirmationDialog } from '@/features/selection/delete-confirmation-dialog'
import { StatusMessage } from './status-message'
import { InitializationError } from '@/features/startup/initialization-error'
import { InitializationProgress } from '@/features/startup/initialization-progress'
import { Outliner } from '@/features/scene-panel/outliner'
import type { PanelSelectById } from '@/editor-state/types/interaction.types'
import { DockedSelectedItemSite } from '@/features/selection/docked-selected-item-site'
import { FloatingSelectedItemSite } from '@/features/selection/floating-selected-item-site'
import type {
  UpdateSelectedItemDetailsInput,
  UpdateSelectedItemDetailsResult,
} from '@/editor-state/types/selected-item.types'
import { SelectedDetailsPlaceholder } from '@/features/selection/selected-details-view'
import { TopHeader } from './top-header/top-header'
import type { TopHeaderShellProps } from './top-header/top-header.types'
import { useOverlayLayout } from '@/shared/layout/overlay-layout-context'
import { useHeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'

interface CameraToolsShellProps {
  onSetCameraPreset: (preset: CameraPreset) => void
  onFocusSelected: () => void
}

interface OutlinerShellProps {
  onSelectById: PanelSelectById
  onPreviewChange: (
    id: string | null,
    source: 'outliner-hover' | 'outliner-focus',
  ) => void
}

interface DockedSelectedItemShellProps {
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onInvalidSelectedItemDetailValue: (fieldLabel: string) => string
  onUpdateSelectedItemDetails: (
    input: UpdateSelectedItemDetailsInput,
  ) => UpdateSelectedItemDetailsResult
}

interface FloatingSelectedItemShellProps {
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
}

interface EditorOverlayProps {
  startOverDisabled: boolean
  topHeader: TopHeaderShellProps
  outliner: OutlinerShellProps
  cameraTools: CameraToolsShellProps
  dockedSelectedItem: DockedSelectedItemShellProps
  floatingSelectedItem: FloatingSelectedItemShellProps
  onConfirmDeleteSelection: () => void
  onRetryAssetLoading: () => void
}

function EditorOverlayDialogs({
  onConfirmDeleteSelection,
  onRetryAssetLoading,
}: {
  onConfirmDeleteSelection: () => void
  onRetryAssetLoading: () => void
}) {
  const isDeleteDialogOpen = useDialogOpen(DIALOG_IDS.delete)
  const pendingDeleteFurniture = useDialogPayload(
    DIALOG_IDS.delete,
  ) as FurnitureItem | null
  const startupLoadingActive = useStartupLoadingActive()
  const assetError = useAssetError()

  return (
    <>
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        pendingDeleteFurniture={pendingDeleteFurniture}
        onClose={dialogActions.closeActiveDialog}
        onConfirm={onConfirmDeleteSelection}
      />
      <InitializationProgress visible={startupLoadingActive} />
      {assetError ? (
        <InitializationError
          errorKind={assetError.kind}
          errorMessage={assetError.message}
          onRetry={onRetryAssetLoading}
        />
      ) : null}
    </>
  )
}

export function EditorOverlay({
  startOverDisabled,
  topHeader,
  outliner,
  cameraTools,
  dockedSelectedItem,
  floatingSelectedItem,
  onConfirmDeleteSelection,
  onRetryAssetLoading,
}: EditorOverlayProps) {
  const { registerExclusionElement } = useOverlayLayout()
  const hasSelection = useHasSelection()
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
            {...topHeader}
            startOverDisabled={startOverDisabled}
            topHeaderRef={registerExclusionElement('top-header')}
            desktopRoomSidebarRef={registerExclusionElement(
              'desktop-room-sidebar',
            )}
            mobileRoomDrawerRef={registerExclusionElement('mobile-room-drawer')}
          />
        </div>

        <FloatingSelectedItemSite
          isCatalogDrawerOpen={isCatalogDrawerOpen}
          {...floatingSelectedItem}
        />

        <div
          className="absolute z-20 pointer-events-auto right-0 top-1/4 -translate-y-1/2"
          ref={registerExclusionElement('camera-tools')}
        >
          <CameraTools
            onSetPreset={cameraTools.onSetCameraPreset}
            onFocusSelected={cameraTools.onFocusSelected}
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
              <Outliner
                onSelectById={outliner.onSelectById}
                onPreviewChange={outliner.onPreviewChange}
              />
            </div>
          )}

          <div className="pointer-events-auto md:col-start-2 md:row-start-1 md:row-span-2 md:justify-self-end">
            {hasSelection ? (
              <DockedSelectedItemSite
                isCatalogDrawerOpen={isCatalogDrawerOpen}
                {...dockedSelectedItem}
              />
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
      <EditorOverlayDialogs
        onConfirmDeleteSelection={onConfirmDeleteSelection}
        onRetryAssetLoading={onRetryAssetLoading}
      />
    </>
  )
}
