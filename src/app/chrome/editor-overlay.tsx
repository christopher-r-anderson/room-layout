import {
  dialogActions,
  useIsDeleteDialogOpen,
  usePendingDeleteFurniture,
} from '@/editor-state/dialog-store'
import {
  useStartupLoadingActive,
  useStartupOverlayActive,
  useAssetError,
} from '@/editor-state/editor-runtime-store'
import { useSceneStateStore } from '@/editor-state/scene-state-store'
import type { CameraPreset } from '@/scene/scene.types'
import { ConnectedCameraTools } from '@/features/camera/camera-tools'
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
import type { HeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'

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
  onHeaderLayoutModeChange: (layout: HeaderLayoutMode) => void
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
  const isDeleteDialogOpen = useIsDeleteDialogOpen()
  const pendingDeleteFurniture = usePendingDeleteFurniture()
  const startupLoadingActive = useStartupLoadingActive()
  const assetError = useAssetError()

  return (
    <>
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        pendingDeleteFurniture={pendingDeleteFurniture}
        onClose={dialogActions.closeDialog}
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
  onHeaderLayoutModeChange,
  topHeader,
  outliner,
  cameraTools,
  dockedSelectedItem,
  floatingSelectedItem,
  onConfirmDeleteSelection,
  onRetryAssetLoading,
}: EditorOverlayProps) {
  const { registerExclusionElement } = useOverlayLayout()
  const selectedId = useSceneStateStore((state) => state.selectedId)
  const startupOverlayActive = useStartupOverlayActive()
  const registerCameraTools = registerExclusionElement('camera-tools')

  return (
    <>
      <div
        className="pointer-events-none absolute inset-2 flex flex-col justify-between"
        inert={startupOverlayActive}
        aria-hidden={startupOverlayActive}
      >
        <TopHeader
          {...topHeader}
          onLayoutModeChange={onHeaderLayoutModeChange}
          startOverDisabled={startOverDisabled}
          topHeaderRef={registerExclusionElement('top-header')}
          desktopRoomSidebarRef={registerExclusionElement(
            'desktop-room-sidebar',
          )}
          mobileRoomDrawerRef={registerExclusionElement('mobile-room-drawer')}
        />

        <div className="grid gap-2 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-end">
          <div
            ref={registerExclusionElement('outliner')}
            className="flex min-w-0 flex-col gap-2 overflow-y-auto md:max-w-80"
          >
            <StatusMessage />
            <Outliner
              onSelectById={outliner.onSelectById}
              onPreviewChange={outliner.onPreviewChange}
            />
          </div>

          {selectedId === null ? (
            <div
              aria-hidden="true"
              className="hidden md:flex md:min-h-32 md:items-end md:justify-end"
            >
              <SelectedDetailsPlaceholder />
            </div>
          ) : null}
        </div>
      </div>

      <DockedSelectedItemSite {...dockedSelectedItem} />
      <FloatingSelectedItemSite {...floatingSelectedItem} />

      <div
        ref={registerCameraTools}
        className="pointer-events-none absolute right-2 bottom-30 md:bottom-2 z-20"
        inert={startupOverlayActive}
        aria-hidden={startupOverlayActive}
      >
        <div className="pointer-events-auto">
          <ConnectedCameraTools
            onSetPreset={cameraTools.onSetCameraPreset}
            onFocusSelected={cameraTools.onFocusSelected}
          />
        </div>
      </div>

      <EditorOverlayDialogs
        onConfirmDeleteSelection={onConfirmDeleteSelection}
        onRetryAssetLoading={onRetryAssetLoading}
      />
    </>
  )
}
