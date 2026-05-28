import type { FurnitureCatalogEntry } from '@/scene/objects/furniture-catalog'
import type {
  DialogOpenOptions,
  DialogReturnFocusTarget,
  EnvironmentDialogLayout,
  EnvironmentDialogOpenOptions,
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
  environmentDialogLayout: EnvironmentDialogLayout | null
  isEnvironmentDialogOpen: boolean
  isInfoDialogOpen: boolean
  isKeyboardShortcutsDialogOpen: boolean
  isMobileMoreOpen: boolean
  isStartOverDialogOpen: boolean
  onCloseStartOverDialog: () => void
  onConfirmStartOver: () => void
  onEnvironmentDialogOpenChange: (
    open: boolean,
    options?: EnvironmentDialogOpenOptions,
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

export interface TopHeaderEnvironmentProps {
  floorFinishId: string
  floorFinishLoading: boolean
  floorFinishes: FloorFinishOption[]
  onFloorFinishChange: (finishId: string) => void
  wallFinishId: string
  wallFinishes: WallFinishOption[]
  onWallFinishChange: (finishId: string) => void
}

export interface TopHeaderProps extends TopHeaderEnvironmentProps {
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
    TopHeaderEnvironmentProps {
  mobileMoreContentId: string
  mobileMoreTriggerId: string
  onOpenEnvironmentFromMobileMore: () => void
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
    TopHeaderEnvironmentProps {
  desktopEnvironmentTriggerId: string
  desktopInfoTriggerId: string
  desktopKeyboardTriggerId: string
  startOverTriggerId: string
}
