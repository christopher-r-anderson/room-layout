import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type {
  DialogOpenOptions,
  DialogReturnFocusTarget,
  RoomSurfaceLayout,
  RoomSurfaceOpenOptions,
} from '@/editor-state/dialog-store'
import type {
  EnvironmentMaterialConfig,
  FloorFinishOption,
  WallFinishOption,
} from '@/shared/lib/three/environment-materials'
import type { Ref } from 'react'
import type { HeaderLayoutMode } from '@/shared/layout/use-header-layout-mode'
interface TopHeaderProps {
  catalog: {
    catalog: FurnitureCatalogEntry[]
    catalogIdToAdd: string
    isCatalogDrawerOpen: boolean
    onAddFurniture: () => boolean
    onCatalogIdToAddChange: (catalogId: string) => void
    onCatalogDrawerOpenChange: (open: boolean) => void
  }
  dialogs: {
    roomSurfaceLayout: RoomSurfaceLayout | null
    isBlockingOverlayOpen: boolean
    isRoomSurfaceOpen: boolean
    isInfoDialogOpen: boolean
    isKeyboardShortcutsDialogOpen: boolean
    isHeaderMoreActionsOpen: boolean
    isStartOverDialogOpen: boolean
    onCloseStartOverDialog: () => void
    onConfirmStartOver: () => void
    onRoomSurfaceOpenChange: (
      open: boolean,
      options?: RoomSurfaceOpenOptions,
    ) => boolean
    onInfoDialogOpenChange: (
      open: boolean,
      options?: DialogOpenOptions,
    ) => boolean
    onKeyboardShortcutsDialogOpenChange: (
      open: boolean,
      options?: DialogOpenOptions,
    ) => boolean
    onHeaderMoreActionsOpenChange: (
      open: boolean,
      options?: DialogOpenOptions,
    ) => boolean
    onOpenStartOverDialog: (options?: DialogOpenOptions) => void
    returnFocusTarget: DialogReturnFocusTarget
  }
  editorInteractionsEnabled: boolean
  history: {
    canRedo: boolean
    canUndo: boolean
    onRedo: () => void
    onUndo: () => void
  }
  floorFinishId: string
  floorFinishLoading: boolean
  floorFinishes: FloorFinishOption[]
  onFloorFinishChange: (finishId: string) => void
  startOverDisabled: boolean
  onLayoutModeChange?: (layout: HeaderLayoutMode) => void
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
  topHeaderRef?: Ref<HTMLDivElement>
  desktopRoomSidebarRef?: Ref<HTMLElement>
  mobileRoomDrawerRef?: Ref<HTMLDivElement>
  wallFinishId: string
  wallFinishes: WallFinishOption[]
  onWallFinishChange: (finishId: string) => void
}

export interface TopHeaderShellProps {
  catalog: FurnitureCatalogEntry[]
  environmentConfig: EnvironmentMaterialConfig | null
  catalogIdToAdd: string
  onAddFurniture: () => boolean
  onCatalogIdToAddChange: (catalogId: string) => void
  onCatalogDrawerOpenChange: (open: boolean) => void
  onUndo: () => void
  onRedo: () => void
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
  onOpenStartOverDialog: (options?: DialogOpenOptions) => void
  onConfirmStartOver: () => void
}

export interface TopHeaderContainerProps extends TopHeaderShellProps {
  startOverDisabled?: boolean
  onLayoutModeChange?: (layout: HeaderLayoutMode) => void
  topHeaderRef?: Ref<HTMLDivElement>
  desktopRoomSidebarRef?: Ref<HTMLElement>
  mobileRoomDrawerRef?: Ref<HTMLDivElement>
}

export interface TopHeaderMobileProps extends Pick<
  TopHeaderProps,
  | 'catalog'
  | 'dialogs'
  | 'editorInteractionsEnabled'
  | 'floorFinishId'
  | 'floorFinishLoading'
  | 'floorFinishes'
  | 'history'
  | 'onFloorFinishChange'
  | 'startOverDisabled'
  | 'onShareSceneUrl'
  | 'onWallFinishChange'
  | 'wallFinishId'
  | 'wallFinishes'
> {
  topHeaderRef?: Ref<HTMLDivElement>
  mobileRoomDrawerRef?: Ref<HTMLDivElement>
  mobileRoomTriggerId: string
  headerMoreActionsContentId: string
  headerMoreActionsTriggerId: string
  onOpenKeyboardShortcutsFromHeaderMoreActions: () => void
  onOpenStartOverFromHeaderMoreActions: () => void
  onOpenProjectInfoFromHeaderMoreActions: () => void
  focusControlById: (id: string) => void
}

export interface TopHeaderDesktopProps extends Pick<
  TopHeaderProps,
  | 'catalog'
  | 'dialogs'
  | 'editorInteractionsEnabled'
  | 'floorFinishId'
  | 'floorFinishLoading'
  | 'floorFinishes'
  | 'history'
  | 'onFloorFinishChange'
  | 'startOverDisabled'
  | 'onShareSceneUrl'
  | 'onWallFinishChange'
  | 'wallFinishId'
  | 'wallFinishes'
> {
  topHeaderRef?: Ref<HTMLDivElement>
  desktopRoomSidebarRef?: Ref<HTMLElement>
  desktopRoomTriggerId: string
  desktopInfoTriggerId: string
  desktopKeyboardTriggerId: string
  startOverTriggerId: string
}
