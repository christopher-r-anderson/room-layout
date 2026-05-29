import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type {
  DialogOpenOptions,
  DialogReturnFocusTarget,
  RoomSurfaceLayout,
  RoomSurfaceOpenOptions,
} from './use-dialog-state'
import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/lib/three/environment-materials'

export interface TopHeaderCatalogProps {
  catalog: FurnitureCatalogEntry[]
  catalogIdToAdd: string
  isCatalogDrawerOpen: boolean
  onAddFurniture: () => boolean
  onCatalogIdToAddChange: (catalogId: string) => void
  onCatalogDrawerOpenChange: (open: boolean) => void
}

export interface TopHeaderHistoryProps {
  canRedo: boolean
  canUndo: boolean
  onRedo: () => void
  onUndo: () => void
}

export interface TopHeaderDialogsProps {
  roomSurfaceLayout: RoomSurfaceLayout | null
  isBlockingOverlayOpen: boolean
  isRoomSurfaceOpen: boolean
  isInfoDialogOpen: boolean
  isKeyboardShortcutsDialogOpen: boolean
  isMobileMoreOpen: boolean
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
  onMobileMoreOpenChange: (
    open: boolean,
    options?: DialogOpenOptions,
  ) => boolean
  onOpenStartOverDialog: (options?: DialogOpenOptions) => void
  returnFocusTarget: DialogReturnFocusTarget
}

export interface TopHeaderRoomProps {
  floorFinishId: string
  floorFinishLoading: boolean
  floorFinishes: FloorFinishOption[]
  onFloorFinishChange: (finishId: string) => void
  wallFinishId: string
  wallFinishes: WallFinishOption[]
  onWallFinishChange: (finishId: string) => void
}

export interface TopHeaderProps extends TopHeaderRoomProps {
  catalog: TopHeaderCatalogProps
  dialogs: TopHeaderDialogsProps
  editorInteractionsEnabled: boolean
  history: TopHeaderHistoryProps
  startOverDisabled: boolean
  onLayoutModeChange?: (layout: 'mobile' | 'desktop') => void
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
}

export interface TopHeaderMobileProps
  extends
    Pick<
      TopHeaderProps,
      | 'catalog'
      | 'dialogs'
      | 'editorInteractionsEnabled'
      | 'history'
      | 'startOverDisabled'
      | 'onShareSceneUrl'
    >,
    TopHeaderRoomProps {
  mobileRoomTriggerId: string
  mobileMoreContentId: string
  mobileMoreTriggerId: string
  onOpenKeyboardShortcutsFromMobileMore: () => void
  onOpenStartOverFromMobileMore: () => void
  onOpenProjectInfoFromMobileMore: () => void
  focusControlById: (id: string) => void
}

export interface TopHeaderDesktopProps
  extends
    Pick<
      TopHeaderProps,
      | 'catalog'
      | 'dialogs'
      | 'editorInteractionsEnabled'
      | 'history'
      | 'startOverDisabled'
      | 'onShareSceneUrl'
    >,
    TopHeaderRoomProps {
  desktopRoomTriggerId: string
  desktopInfoTriggerId: string
  desktopKeyboardTriggerId: string
  startOverTriggerId: string
}
