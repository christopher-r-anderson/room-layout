import { useCallback, useLayoutEffect, useRef, useState } from 'react'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import type {
  DialogOpenOptions,
  DialogReturnFocusTarget,
  RoomSurfaceLayout,
  RoomSurfaceOpenOptions,
} from './use-dialog-state'
import type { CameraPreset, SceneReadModel } from '@/scene/scene.types'
import { CameraTools } from '../camera/camera-tools'
import { DeleteConfirmationDialog } from '../selection/delete-confirmation-dialog'
import type { HistoryAvailability } from '../history/history.types'
import { StatusMessage } from './status-message'
import { InitializationError } from '../startup/initialization-error'
import { InitializationProgress } from '../startup/initialization-progress'
import { Outliner } from '../scene-panel/outliner'
import type { SceneOutlinerFocusRequest } from '../scene-panel.types'
import type { StartupErrorKind } from '../startup/use-startup-state'
import type { PanelSelectById } from '../scene-interaction.types'
import { SelectedItemDetailsPlaceholder } from '../selection/selected-item-details'
import { TopHeader } from './top-header'
export interface EditorCameraProps {
  onSetCameraPreset: (preset: CameraPreset) => void
  onFocusSelected: () => void
}

export interface EditorStartupProps {
  assetError: boolean
  assetErrorKind: StartupErrorKind | null
  assetErrorMessage: string | null
  startupLoadingActive: boolean
  startupOverlayActive: boolean
  onRetryAssetLoading: () => void
}

export interface EditorHistoryProps {
  historyAvailability: HistoryAvailability
  onUndo: () => void
  onRedo: () => void
}

export interface EditorSceneProps {
  focusRequest: SceneOutlinerFocusRequest | null
  onFocusHandled: () => void
  onNavigateBackToSelectionControls: () => boolean
  onSelectById: PanelSelectById
  readModel: SceneReadModel
  sceneInteractionsDisabled: boolean
}

export interface EditorCatalogProps {
  catalog: FurnitureCatalogEntry[]
  catalogIdToAdd: string
  isCatalogDrawerOpen: boolean
  onAddFurniture: () => boolean
  onCatalogIdToAddChange: (catalogId: string) => void
  onCatalogDrawerOpenChange: (open: boolean) => void
}

export interface EditorDialogsProps {
  roomSurfaceLayout: RoomSurfaceLayout | null
  isDeleteDialogOpen: boolean
  isBlockingOverlayOpen: boolean
  pendingDeleteFurniture: FurnitureItem | null
  onCloseDeleteDialog: () => void
  onConfirmDeleteSelection: () => void
  isRoomSurfaceOpen: boolean
  isMobileMoreOpen: boolean
  onRoomSurfaceOpenChange: (
    open: boolean,
    options?: RoomSurfaceOpenOptions,
  ) => boolean
  isKeyboardShortcutsDialogOpen: boolean
  onKeyboardShortcutsDialogOpenChange: (
    open: boolean,
    options?: DialogOpenOptions,
  ) => boolean
  isStartOverDialogOpen: boolean
  onCloseStartOverDialog: () => void
  onOpenStartOverDialog: (options?: DialogOpenOptions) => void
  onConfirmStartOver: () => void
  isInfoDialogOpen: boolean
  onInfoDialogOpenChange: (
    open: boolean,
    options?: DialogOpenOptions,
  ) => boolean
  onMobileMoreOpenChange: (
    open: boolean,
    options?: DialogOpenOptions,
  ) => boolean
  returnFocusTarget: DialogReturnFocusTarget
}

export interface EditorPreviewProps {
  previewedId: string | null
  onPreviewChange: (
    id: string | null,
    source: 'outliner-hover' | 'outliner-focus',
  ) => void
}

interface EditorOverlayProps {
  editorInteractionsEnabled: boolean
  startOverDisabled: boolean
  onHeaderLayoutModeChange: (layout: 'mobile' | 'desktop') => void
  statusMessage: string | null
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
  camera: EditorCameraProps
  startup: EditorStartupProps
  history: EditorHistoryProps
  scene: EditorSceneProps
  catalog: EditorCatalogProps
  dialogs: EditorDialogsProps
  preview: EditorPreviewProps
  floorFinishId: string
  floorFinishLoading: boolean
  floorFinishes: FloorFinishOption[]
  onFloorFinishChange: (finishId: string) => void
  wallFinishId: string
  wallFinishes: WallFinishOption[]
  onWallFinishChange: (finishId: string) => void
  topHeaderElementRef?: (element: HTMLDivElement | null) => void
  desktopRoomSidebarElementRef?: (element: HTMLElement | null) => void
  mobileRoomDrawerElementRef?: (element: HTMLDivElement | null) => void
  outlinerElementRef?: (element: HTMLDivElement | null) => void
  cameraToolsElementRef?: (element: HTMLDivElement | null) => void
}

export function EditorOverlay({
  editorInteractionsEnabled,
  startOverDisabled,
  onHeaderLayoutModeChange,
  statusMessage,
  onShareSceneUrl,
  camera,
  startup,
  history,
  scene,
  catalog,
  dialogs,
  preview,
  floorFinishId,
  floorFinishLoading,
  floorFinishes,
  onFloorFinishChange,
  wallFinishId,
  wallFinishes,
  onWallFinishChange,
  topHeaderElementRef,
  desktopRoomSidebarElementRef,
  mobileRoomDrawerElementRef,
  outlinerElementRef,
  cameraToolsElementRef,
}: EditorOverlayProps) {
  const cameraAnchorRef = useRef<HTMLDivElement | null>(null)
  const [cameraAnchorHeight, setCameraAnchorHeight] = useState(0)
  const isDesktopRoomOpen =
    dialogs.isRoomSurfaceOpen && dialogs.roomSurfaceLayout === 'desktop'
  const isMobileRoomOpen =
    dialogs.isRoomSurfaceOpen && dialogs.roomSurfaceLayout === 'mobile'

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
      cameraToolsElementRef?.(element)
    },
    [cameraToolsElementRef],
  )

  return (
    <>
      <div
        className="pointer-events-none absolute inset-2 flex flex-col justify-between"
        inert={startup.startupOverlayActive}
        aria-hidden={startup.startupOverlayActive}
      >
        <TopHeader
          topHeaderRef={topHeaderElementRef}
          desktopRoomSidebarRef={desktopRoomSidebarElementRef}
          mobileRoomDrawerRef={mobileRoomDrawerElementRef}
          catalog={{
            catalog: catalog.catalog,
            catalogIdToAdd: catalog.catalogIdToAdd,
            isCatalogDrawerOpen: catalog.isCatalogDrawerOpen,
            onAddFurniture: catalog.onAddFurniture,
            onCatalogDrawerOpenChange: catalog.onCatalogDrawerOpenChange,
            onCatalogIdToAddChange: catalog.onCatalogIdToAddChange,
          }}
          dialogs={dialogs}
          editorInteractionsEnabled={editorInteractionsEnabled}
          floorFinishId={floorFinishId}
          floorFinishLoading={floorFinishLoading}
          floorFinishes={floorFinishes}
          history={{
            canRedo: history.historyAvailability.canRedo,
            canUndo: history.historyAvailability.canUndo,
            onRedo: history.onRedo,
            onUndo: history.onUndo,
          }}
          startOverDisabled={startOverDisabled}
          onLayoutModeChange={onHeaderLayoutModeChange}
          onShareSceneUrl={onShareSceneUrl}
          onFloorFinishChange={onFloorFinishChange}
          wallFinishId={wallFinishId}
          wallFinishes={wallFinishes}
          onWallFinishChange={onWallFinishChange}
        />

        <div className="grid gap-2 md:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] md:items-end">
          <div
            ref={outlinerElementRef}
            className="flex min-w-0 flex-col gap-2 overflow-y-auto md:max-w-80"
          >
            <StatusMessage message={statusMessage} />
            <Outliner
              readModel={scene.readModel}
              disabled={scene.sceneInteractionsDisabled}
              focusRequest={scene.focusRequest}
              onFocusHandled={scene.onFocusHandled}
              onNavigateBackToSelectionControls={
                scene.onNavigateBackToSelectionControls
              }
              onSelectById={scene.onSelectById}
              previewedId={preview.previewedId}
              onPreviewChange={preview.onPreviewChange}
            />
          </div>

          {scene.readModel.selectedId === null ? (
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
        inert={startup.startupOverlayActive}
        aria-hidden={startup.startupOverlayActive}
      >
        <div className="pointer-events-auto">
          <CameraTools
            editorInteractionsEnabled={editorInteractionsEnabled}
            hasSelection={scene.readModel.selectedId !== null}
            onSetPreset={camera.onSetCameraPreset}
            onFocusSelected={camera.onFocusSelected}
          />
        </div>
      </div>

      {/*
        Currently need to manage the open state of the DeleteConfirmationDialog because close on action is currently broken with BaseUI
        https://github.com/shadcn-ui/ui/issues/9340
        https://github.com/shadcn-ui/ui/pull/9347
      */}
      <DeleteConfirmationDialog
        open={dialogs.isDeleteDialogOpen}
        pendingDeleteFurniture={dialogs.pendingDeleteFurniture}
        onClose={dialogs.onCloseDeleteDialog}
        onConfirm={dialogs.onConfirmDeleteSelection}
      />
      <InitializationProgress visible={startup.startupLoadingActive} />
      {startup.assetError ? (
        <InitializationError
          errorKind={startup.assetErrorKind}
          errorMessage={startup.assetErrorMessage}
          onRetry={startup.onRetryAssetLoading}
        />
      ) : null}
    </>
  )
}
