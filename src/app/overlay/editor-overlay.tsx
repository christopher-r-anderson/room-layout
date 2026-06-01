import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import {
  dialogActions,
  useIsDeleteDialogOpen,
  useIsRoomSurfaceOpen,
  usePendingDeleteFurniture,
  useRoomSurfaceLayout,
} from '@/editor-state/dialog-store'
import {
  useStartupLoadingActive,
  useStartupOverlayActive,
  useAssetError,
} from '@/editor-state/editor-runtime-store'
import { useSceneStateStore } from '@/editor-state/scene-state-store'
import type { CameraPreset } from '@/scene/scene.types'
import { ConnectedCameraTools } from '../camera/camera-tools'
import { DeleteConfirmationDialog } from '../selection/delete-confirmation-dialog'
import { StatusMessage } from './status-message'
import { InitializationError } from '../startup/initialization-error'
import { InitializationProgress } from '../startup/initialization-progress'
import { Outliner } from '../scene-panel/outliner'
import type { PanelSelectById } from '../scene-interaction.types'
import { SelectedItemDetailsPlaceholder } from '../selection/selected-item-details'
import { TopHeader } from './top-header'
import type { TopHeaderShellProps } from './top-header.types'
import { useOverlayLayout } from '../contexts/overlay-layout-context'

export interface CameraToolsShellProps {
  onSetCameraPreset: (preset: CameraPreset) => void
  onFocusSelected: () => void
}

export interface OutlinerShellProps {
  onNavigateBackToSelectionControls: () => boolean
  onSelectById: PanelSelectById
  onPreviewChange: (
    id: string | null,
    source: 'outliner-hover' | 'outliner-focus',
  ) => void
}

interface EditorOverlayProps {
  startOverDisabled: boolean
  onHeaderLayoutModeChange: (layout: 'mobile' | 'desktop') => void
  topHeader: TopHeaderShellProps
  outliner: OutlinerShellProps
  cameraTools: CameraToolsShellProps
  onConfirmDeleteSelection: () => void
  onRetryAssetLoading: () => void
}

export function EditorOverlayDialogs({
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
  onConfirmDeleteSelection,
  onRetryAssetLoading,
}: EditorOverlayProps) {
  const { registerExclusionElement } = useOverlayLayout()
  const cameraAnchorRef = useRef<HTMLDivElement | null>(null)
  const [cameraAnchorHeight, setCameraAnchorHeight] = useState(0)
  const roomSurfaceLayout = useRoomSurfaceLayout()
  const isRoomSurfaceOpen = useIsRoomSurfaceOpen()
  const selectedId = useSceneStateStore((state) => state.selectedId)
  const startupOverlayActive = useStartupOverlayActive()
  const isDesktopRoomOpen = isRoomSurfaceOpen && roomSurfaceLayout === 'desktop'
  const isMobileRoomOpen = isRoomSurfaceOpen && roomSurfaceLayout === 'mobile'

  useLayoutEffect(() => {
    const element = cameraAnchorRef.current

    if (!element) {
      return
    }

    const updateHeight = () => {
      setCameraAnchorHeight(element.getBoundingClientRect().height)
    }

    updateHeight()

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateHeight)

      return () => {
        window.removeEventListener('resize', updateHeight)
      }
    }

    const observer = new ResizeObserver(() => {
      updateHeight()
    })

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [])

  const centeredBottom =
    cameraAnchorHeight > 0
      ? `calc(50% - ${String(cameraAnchorHeight / 2)}px)`
      : '50%'
  const mobileOpenBottom = 'calc(50dvh + 0.5rem)'
  const handleCameraAnchorRef = useCallback(
    (element: HTMLDivElement | null) => {
      cameraAnchorRef.current = element
      registerExclusionElement('camera-tools')(element)
    },
    [registerExclusionElement],
  )

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
              onNavigateBackToSelectionControls={
                outliner.onNavigateBackToSelectionControls
              }
              onSelectById={outliner.onSelectById}
              onPreviewChange={outliner.onPreviewChange}
            />
          </div>

          {selectedId === null ? (
            <div
              aria-hidden="true"
              className="hidden md:flex md:min-h-32 md:items-end md:justify-end"
            >
              <SelectedItemDetailsPlaceholder />
            </div>
          ) : null}
        </div>
      </div>

      <div
        ref={handleCameraAnchorRef}
        data-camera-anchor
        className={`pointer-events-none absolute transition-[bottom,right] duration-200 ${
          isDesktopRoomOpen ? 'right-94' : 'right-2'
        }`}
        style={{
          bottom: isMobileRoomOpen ? mobileOpenBottom : centeredBottom,
        }}
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
