import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type {
  MoveSelectionResult,
  MoveSource,
  SceneReadModel,
} from '@/scene/scene.types'
import { DeleteConfirmationDialog } from './components/selection/delete-confirmation-dialog'
import type { HistoryAvailability } from './components/history/history.types'
import { StatusMessage } from './components/status-message'
import { InitializationError } from './components/initialization/initialization-error'
import { CatalogDrawer } from './components/catalog/catalog-drawer'
import { ProjectInfoDialog } from './components/project-info/project-info-dialog'
import { InitializationProgress } from './components/initialization/initialization-progress'
import { ProjectInfoButton } from './components/project-info/project-info-button'
import { CatalogAddButton } from './components/catalog/catalog-add-button'
import { CurrentSelectionStatus } from './components/selection/current-selection-status'
import { ButtonGroup } from '@/components/ui/button-group'
import { HistoryTools } from './components/history/history-tools'
import { SelectionTools } from './components/selection/selection-tools'
import {
  SceneOutliner,
  type SceneOutlinerFocusRequest,
} from './components/scene/scene-outliner'
import { SceneInspector } from './components/scene/scene-inspector'

export interface EditorStartupProps {
  assetError: boolean
  startupLoadingActive: boolean
  startupOverlayActive: boolean
  onRetryAssetLoading: () => void
}

export interface EditorHistoryProps {
  historyAvailability: HistoryAvailability
  onUndo: () => void
  onRedo: () => void
}

export interface EditorSelectionProps {
  selectedFurniture: FurnitureItem | null
  onMoveSelection: (
    delta: { x: number; z: number },
    options?: { source?: MoveSource },
  ) => MoveSelectionResult
  onOpenDeleteDialog: () => void
  onRotateSelection: (direction: -1 | 1) => void
}

export interface EditorSceneProps {
  focusRequest: SceneOutlinerFocusRequest | null
  onFocusHandled: () => void
  onSelectById: (id: string | null) => void
  readModel: SceneReadModel
  sceneInteractionsDisabled: boolean
}

export interface EditorCatalogProps {
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
  isInfoDialogOpen: boolean
  onInfoDialogOpenChange: (open: boolean) => void
}

interface EditorOverlayProps {
  editorInteractionsEnabled: boolean
  statusMessage: string | null
  startup: EditorStartupProps
  history: EditorHistoryProps
  scene: EditorSceneProps
  selection: EditorSelectionProps
  catalog: EditorCatalogProps
  dialogs: EditorDialogsProps
}

export function EditorOverlay({
  editorInteractionsEnabled,
  statusMessage,
  startup,
  history,
  scene,
  selection,
  catalog,
  dialogs,
}: EditorOverlayProps) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-2 gap-2 grid grid-cols-2 grid-rows-[min-content_min-content_1fr] sm:grid-rows-[min-content_1fr]"
        inert={startup.startupOverlayActive}
        aria-hidden={startup.startupOverlayActive}
      >
        <div className="col-span-2 sm:col-span-1">
          <ButtonGroup aria-label="Toolbar" className="pointer-events-auto">
            <HistoryTools
              canRedo={history.historyAvailability.canRedo}
              canUndo={history.historyAvailability.canUndo}
              editorInteractionsEnabled={editorInteractionsEnabled}
              onRedo={history.onRedo}
              onUndo={history.onUndo}
            />
            <SelectionTools
              editorInteractionsEnabled={editorInteractionsEnabled}
              onOpenDeleteDialog={selection.onOpenDeleteDialog}
              onRotateSelection={selection.onRotateSelection}
              selectedFurniture={selection.selectedFurniture}
            />
          </ButtonGroup>
          <StatusMessage message={statusMessage} />
        </div>

        <div className="col-span-2 sm:col-span-1 justify-self-end flex gap-4">
          <h1 className="text-lg font-semibold">Room Layout</h1>
          <ProjectInfoDialog
            open={dialogs.isInfoDialogOpen}
            onOpenChange={dialogs.onInfoDialogOpenChange}
            triggerButton={
              <ProjectInfoButton className="pointer-events-auto" />
            }
          />
        </div>

        <div className="self-end flex w-full max-w-sm flex-col gap-2">
          <CurrentSelectionStatus
            selectedFurniture={selection.selectedFurniture}
            className="pointer-events-auto"
          />
          <SceneOutliner
            readModel={scene.readModel}
            disabled={scene.sceneInteractionsDisabled}
            focusRequest={scene.focusRequest}
            onFocusHandled={scene.onFocusHandled}
            onSelectById={scene.onSelectById}
          />
          <SceneInspector
            disabled={scene.sceneInteractionsDisabled}
            onMoveSelection={selection.onMoveSelection}
            onOpenDeleteDialog={selection.onOpenDeleteDialog}
            onRotateSelection={selection.onRotateSelection}
            selectedFurniture={selection.selectedFurniture}
          />
        </div>

        <div className="justify-self-end self-end flex flex-col items-end gap-2">
          <p className="pointer-events-auto max-w-xs rounded-md bg-background/90 px-2 py-1 text-xs/relaxed text-muted-foreground shadow-sm backdrop-blur-sm">
            Keyboard: arrow keys move, Shift moves farther, Alt moves finely,
            and Escape clears selection.
          </p>
          <CatalogDrawer
            open={catalog.isCatalogDrawerOpen}
            onOpenChange={catalog.onCatalogDrawerOpenChange}
            triggerButton={<CatalogAddButton className="pointer-events-auto" />}
            catalogIdToAdd={catalog.catalogIdToAdd}
            editorInteractionsEnabled={editorInteractionsEnabled}
            onAddFurniture={catalog.onAddFurniture}
            onCatalogIdToAddChange={catalog.onCatalogIdToAddChange}
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
        <InitializationError onRetry={startup.onRetryAssetLoading} />
      ) : null}
    </>
  )
}
