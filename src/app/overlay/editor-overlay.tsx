import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'
import type { CameraPreset, SceneReadModel } from '@/scene/scene.types'
import { CameraTools } from '../camera/camera-tools'
import { DeleteConfirmationDialog } from '../selection/delete-confirmation-dialog'
import { NewSceneConfirmationDialog } from '../selection/new-scene-confirmation-dialog'
import type { HistoryAvailability } from '../history/history.types'
import { StatusMessage } from './status-message'
import { InitializationError } from '../startup/initialization-error'
import { CatalogDrawer } from '../catalog/catalog-drawer'
import { ProjectInfoDialog } from '../project-info/project-info-dialog'
import { InitializationProgress } from '../startup/initialization-progress'
import { ProjectInfoButton } from '../project-info/project-info-button'
import { CatalogAddButton } from '../catalog/catalog-add-button'
import { KeyboardShortcutsHelp } from '../keyboard/keyboard-shortcuts-help'
import { HistoryTools } from '../history/history-tools'
import { Outliner } from '../scene-panel/outliner'
import { EnvironmentPanel } from './environment-panel'
import type { SceneOutlinerFocusRequest } from '../scene-panel.types'
import type { StartupErrorKind } from '../startup/use-startup-state'
import { CopySceneUrlButton } from './copy-scene-url-button'
import { NewSceneButton } from './new-scene-button'
import type { PanelSelectById } from '../scene-interaction.types'

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
  isDeleteDialogOpen: boolean
  pendingDeleteFurniture: FurnitureItem | null
  onCloseDeleteDialog: () => void
  onConfirmDeleteSelection: () => void
  isNewSceneDialogOpen: boolean
  onCloseNewSceneDialog: () => void
  onOpenNewSceneDialog: () => void
  onConfirmNewScene: () => void
  isInfoDialogOpen: boolean
  onInfoDialogOpenChange: (open: boolean) => void
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
  newSceneDisabled: boolean
  statusMessage: string | null
  onCopySceneUrl: () => Promise<boolean>
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
}

export function EditorOverlay({
  editorInteractionsEnabled,
  newSceneDisabled,
  statusMessage,
  onCopySceneUrl,
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
}: EditorOverlayProps) {
  return (
    <>
      <div
        className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2"
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

      <div
        className="pointer-events-none absolute inset-2 flex flex-col justify-between"
        inert={startup.startupOverlayActive}
        aria-hidden={startup.startupOverlayActive}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            role="toolbar"
            aria-label="Editor actions"
            className="pointer-events-auto flex w-full flex-wrap gap-2"
          >
            <HistoryTools
              canRedo={history.historyAvailability.canRedo}
              canUndo={history.historyAvailability.canUndo}
              editorInteractionsEnabled={editorInteractionsEnabled}
              onRedo={history.onRedo}
              onUndo={history.onUndo}
            />
          </div>

          <div className="shrink-0">
            <div className="pointer-events-auto rounded-md border border-border/70 bg-background/75 p-2 backdrop-blur-[2px]">
              <div className="flex items-center justify-end gap-2">
                <h1 className="px-1 text-base/6 font-semibold text-foreground">
                  Room Layout
                </h1>
                <ProjectInfoDialog
                  open={dialogs.isInfoDialogOpen}
                  onOpenChange={dialogs.onInfoDialogOpenChange}
                  triggerButton={<ProjectInfoButton />}
                />
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                <NewSceneButton
                  disabled={!editorInteractionsEnabled || newSceneDisabled}
                  disabledMessage={
                    !editorInteractionsEnabled
                      ? 'Editor interactions are unavailable while loading'
                      : 'Scene already matches defaults'
                  }
                  onOpenNewSceneDialog={dialogs.onOpenNewSceneDialog}
                />
                <CopySceneUrlButton
                  disabled={!editorInteractionsEnabled}
                  onCopySceneUrl={onCopySceneUrl}
                />
              </div>
            </div>
          </div>
        </div>

        {/*
          flex-col-reverse here with flex-row-reverse on the inner drawer/shortcuts group
          would give us a better small screen order, but without `reading-flow` being non-experimental/baseline
          it is confusing with screen readers and keyboard tabbing
        */}
        <div className="flex flex-wrap sm:flex-row justify-between gap-2">
          <div className="flex w-full sm:w-80 flex-col gap-2 overflow-y-auto">
            <StatusMessage message={statusMessage} />
            <Outliner
              readModel={scene.readModel}
              disabled={scene.sceneInteractionsDisabled}
              focusRequest={scene.focusRequest}
              onFocusHandled={scene.onFocusHandled}
              onSelectById={scene.onSelectById}
              previewedId={preview.previewedId}
              onPreviewChange={preview.onPreviewChange}
            />
            <EnvironmentPanel
              floorFinishId={floorFinishId}
              floorFinishLoading={floorFinishLoading}
              floorFinishes={floorFinishes}
              onFloorFinishChange={onFloorFinishChange}
              wallFinishId={wallFinishId}
              wallFinishes={wallFinishes}
              onWallFinishChange={onWallFinishChange}
            />
          </div>

          <div className="flex w-full sm:w-auto sm:flex-col justify-between sm:justify-end items-end gap-2">
            <CatalogDrawer
              open={catalog.isCatalogDrawerOpen}
              onOpenChange={catalog.onCatalogDrawerOpenChange}
              triggerButton={
                <CatalogAddButton className="pointer-events-auto" />
              }
              catalog={catalog.catalog}
              catalogIdToAdd={catalog.catalogIdToAdd}
              editorInteractionsEnabled={editorInteractionsEnabled}
              onAddFurniture={catalog.onAddFurniture}
              onCatalogIdToAddChange={catalog.onCatalogIdToAddChange}
            />
            <div inert={catalog.isCatalogDrawerOpen}>
              <KeyboardShortcutsHelp />
            </div>
          </div>
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
      <NewSceneConfirmationDialog
        open={dialogs.isNewSceneDialogOpen}
        onClose={dialogs.onCloseNewSceneDialog}
        onConfirm={dialogs.onConfirmNewScene}
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
