import type { FurnitureItem } from '@/scene/objects/furniture.types'
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

interface EditorOverlayProps {
  assetError: boolean
  catalogIdToAdd: string
  editorInteractionsEnabled: boolean
  editorMessage: string | null
  historyAvailability: HistoryAvailability
  isCatalogDrawerOpen: boolean
  isDeleteDialogOpen: boolean
  isInfoDialogOpen: boolean
  onAddFurniture: () => boolean
  onCatalogIdToAddChange: (catalogId: string) => void
  onCatalogDrawerOpenChange: (open: boolean) => void
  onCloseDeleteDialog: () => void
  onConfirmDeleteSelection: () => void
  onOpenDeleteDialog: () => void
  onInfoDialogOpenChange: (open: boolean) => void
  onRedo: () => void
  onRetryAssetLoading: () => void
  onRotateSelection: (direction: -1 | 1) => void
  onUndo: () => void
  pendingDeleteFurniture: FurnitureItem | null
  selectedFurniture: FurnitureItem | null
  startupLoadingActive: boolean
  startupOverlayActive: boolean
}

export function EditorOverlay({
  assetError,
  catalogIdToAdd,
  isCatalogDrawerOpen,
  isDeleteDialogOpen,
  isInfoDialogOpen,
  editorInteractionsEnabled,
  editorMessage,
  historyAvailability,
  onAddFurniture,
  onCatalogIdToAddChange,
  onCatalogDrawerOpenChange,
  onCloseDeleteDialog,
  onConfirmDeleteSelection,
  onInfoDialogOpenChange,
  onOpenDeleteDialog,
  onRedo,
  onRetryAssetLoading,
  onRotateSelection,
  onUndo,
  pendingDeleteFurniture,
  selectedFurniture,
  startupLoadingActive,
  startupOverlayActive,
}: EditorOverlayProps) {
  return (
    <>
      <div
        className="pointer-events-none absolute inset-2 gap-2 grid grid-cols-2 grid-rows-[min-content_min-content_1fr] sm:grid-rows-[min-content_1fr]"
        inert={startupOverlayActive}
        aria-hidden={startupOverlayActive}
      >
        <div className="col-span-2 sm:col-span-1">
          <ButtonGroup aria-label="Toolbar" className="pointer-events-auto">
            <HistoryTools
              canRedo={historyAvailability.canRedo}
              canUndo={historyAvailability.canUndo}
              editorInteractionsEnabled={editorInteractionsEnabled}
              onRedo={onRedo}
              onUndo={onUndo}
            />
            <SelectionTools
              editorInteractionsEnabled={editorInteractionsEnabled}
              onOpenDeleteDialog={onOpenDeleteDialog}
              onRotateSelection={onRotateSelection}
              selectedFurniture={selectedFurniture}
            />
          </ButtonGroup>
          <StatusMessage message={editorMessage} />
        </div>

        <div className="col-span-2 sm:col-span-1 justify-self-end flex gap-4">
          <h1 className="text-lg font-semibold">Room Layout</h1>
          <ProjectInfoDialog
            open={isInfoDialogOpen}
            onOpenChange={onInfoDialogOpenChange}
            triggerButton={
              <ProjectInfoButton className="pointer-events-auto" />
            }
          />
        </div>

        <div className="self-end">
          <CurrentSelectionStatus
            selectedFurniture={selectedFurniture}
            className="pointer-events-auto"
          />
        </div>

        <div className="justify-self-end self-end">
          <CatalogDrawer
            open={isCatalogDrawerOpen}
            onOpenChange={onCatalogDrawerOpenChange}
            triggerButton={<CatalogAddButton className="pointer-events-auto" />}
            catalogIdToAdd={catalogIdToAdd}
            editorInteractionsEnabled={editorInteractionsEnabled}
            onAddFurniture={onAddFurniture}
            onCatalogIdToAddChange={onCatalogIdToAddChange}
          />
        </div>
      </div>

      {/*
        Currently need to manage the open state of the DeleteConfirmationDialog because close on action is currently broken with BaseUI
        https://github.com/shadcn-ui/ui/issues/9340
        https://github.com/shadcn-ui/ui/pull/9347
      */}
      <DeleteConfirmationDialog
        open={isDeleteDialogOpen}
        pendingDeleteFurniture={pendingDeleteFurniture}
        onClose={onCloseDeleteDialog}
        onConfirm={onConfirmDeleteSelection}
      />

      <InitializationProgress visible={startupLoadingActive} />
      {assetError ? (
        <InitializationError onRetry={onRetryAssetLoading} />
      ) : null}
    </>
  )
}
