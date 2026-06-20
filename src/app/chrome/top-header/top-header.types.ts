import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type { AppDialogOpenRequest } from '@/app/dialogs/dialog-requests'
import type {
  EnvironmentMaterialConfig,
  FloorFinishOption,
  WallFinishOption,
} from '@/shared/lib/three/environment-materials'
import type { Ref } from 'react'

interface TopHeaderProps {
  catalog: {
    catalog: FurnitureCatalogEntry[]
    catalogIdToAdd: string
    isCatalogDrawerOpen: boolean
    onAddFurniture: () => boolean
    onCatalogIdToAddChange: (catalogId: string) => void
    onCatalogDrawerOpenChange: (open: boolean) => void
  }
  editorInteractionsEnabled: boolean
  history: {
    canRedo: boolean
    canUndo: boolean
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

type TopHeaderToolbarProps = Pick<
  TopHeaderProps,
  | 'catalog'
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
>

export interface TopHeaderShellProps {
  catalog: FurnitureCatalogEntry[]
  environmentConfig: EnvironmentMaterialConfig | null
  catalogIdToAdd: string
  onAddFurniture: () => boolean
  onCatalogIdToAddChange: (catalogId: string) => void
  onCatalogDrawerOpenChange: (open: boolean) => void
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
  onOpenStartOverDialog: (request?: AppDialogOpenRequest) => void
  onConfirmStartOver: () => void
}

export interface TopHeaderContainerProps extends TopHeaderShellProps {
  startOverDisabled?: boolean
  topHeaderRef?: Ref<HTMLDivElement>
  desktopRoomSidebarRef?: Ref<HTMLElement>
  mobileRoomDrawerRef?: Ref<HTMLDivElement>
}

export interface TopHeaderMobileProps extends TopHeaderToolbarProps {
  topHeaderRef?: Ref<HTMLDivElement>
  mobileRoomDrawerRef?: Ref<HTMLDivElement>
  isRoomSurfaceOpen: boolean
  isHeaderMoreActionsOpen: boolean
  blockingOverlayOpen: boolean
  onOpenKeyboardShortcutsFromHeaderMoreActions: () => void
  onOpenStartOverFromHeaderMoreActions: () => void
  onOpenProjectInfoFromHeaderMoreActions: () => void
}

export interface TopHeaderDesktopProps extends TopHeaderToolbarProps {
  topHeaderRef?: Ref<HTMLDivElement>
  desktopRoomSidebarRef?: Ref<HTMLElement>
  isRoomSurfaceOpen: boolean
  isKeyboardShortcutsOpen: boolean
  isProjectInfoOpen: boolean
  onOpenStartOverDialog: (request?: AppDialogOpenRequest) => void
}
