import type { FurnitureItem } from '@/scene/objects/furniture.types'
import type {
  MoveSelectionResult,
  MoveSource,
  SceneReadModel,
} from '@/scene/scene.types'
import { DeleteConfirmationDialog } from '../selection/delete-confirmation-dialog'
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
import { SelectionToolsMovement } from '../selection/selection-tools-movement'
import { SelectionToolsOther } from '../selection/selection-tools-other'
import { Outliner } from '../scene-panel/outliner'
import type { SceneOutlinerFocusRequest } from '../scene-panel.types'
import { Inspector } from '../scene-panel/inspector'

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
        className="pointer-events-none absolute inset-2 flex flex-col justify-between"
        inert={startup.startupOverlayActive}
        aria-hidden={startup.startupOverlayActive}
      >
        <div className="flex justify-between gap-2">
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
            <SelectionToolsMovement
              editorInteractionsEnabled={editorInteractionsEnabled}
              onMoveSelection={selection.onMoveSelection}
              selectedFurniture={selection.selectedFurniture}
            />
            <SelectionToolsOther
              editorInteractionsEnabled={editorInteractionsEnabled}
              onOpenDeleteDialog={selection.onOpenDeleteDialog}
              onRotateSelection={selection.onRotateSelection}
              selectedFurniture={selection.selectedFurniture}
            />
          </div>

          <div className="justify-self-end shrink-0 flex items-start gap-4">
            <h1 className="text-lg text-background font-semibold">
              Room Layout
            </h1>
            <ProjectInfoDialog
              open={dialogs.isInfoDialogOpen}
              onOpenChange={dialogs.onInfoDialogOpenChange}
              triggerButton={
                <ProjectInfoButton className="pointer-events-auto" />
              }
            />
          </div>
        </div>

        {/*
          flex-col-reverse here with flex-row-reverse on the inner drawer/shortcuts group
          would give us a better small screen order, but without `reading-flow` being non-experimental/baseline
          it is confusing with screen readers and keyboard tabbing
        */}
        <div className="flex flex-wrap sm:flex-row justify-between gap-2">
          <div className="flex w-full sm:w-80 flex-col gap-2">
            <StatusMessage message={statusMessage} />
            <Outliner
              readModel={scene.readModel}
              disabled={scene.sceneInteractionsDisabled}
              focusRequest={scene.focusRequest}
              onFocusHandled={scene.onFocusHandled}
              onSelectById={scene.onSelectById}
            />
            <Inspector selectedFurniture={selection.selectedFurniture} />
          </div>

          <div className="flex w-full sm:w-auto sm:flex-col justify-between sm:justify-end items-end gap-2">
            <CatalogDrawer
              open={catalog.isCatalogDrawerOpen}
              onOpenChange={catalog.onCatalogDrawerOpenChange}
              triggerButton={
                <CatalogAddButton className="pointer-events-auto" />
              }
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

      <InitializationProgress visible={startup.startupLoadingActive} />
      {startup.assetError ? (
        <InitializationError onRetry={startup.onRetryAssetLoading} />
      ) : null}
    </>
  )
}
