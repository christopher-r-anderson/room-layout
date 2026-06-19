import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type {
  DialogAccessPoint,
  DialogOpenRequest,
} from '@/editor-state/dialog-contract'
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
    roomSurfaceLayout: HeaderLayoutMode | null
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
      request?: DialogOpenRequest<{ layout: HeaderLayoutMode }>,
    ) => boolean
    onInfoDialogOpenChange: (
      open: boolean,
      request?: DialogOpenRequest,
    ) => boolean
    onKeyboardShortcutsDialogOpenChange: (
      open: boolean,
      request?: DialogOpenRequest,
    ) => boolean
    onHeaderMoreActionsOpenChange: (
      open: boolean,
      request?: DialogOpenRequest,
    ) => boolean
    onOpenStartOverDialog: (request?: DialogOpenRequest) => void
    returnFocusAccessPoint: DialogAccessPoint
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
  onOpenStartOverDialog: (request?: DialogOpenRequest) => void
  onConfirmStartOver: () => void
}

export interface TopHeaderContainerProps extends TopHeaderShellProps {
  startOverDisabled?: boolean
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
