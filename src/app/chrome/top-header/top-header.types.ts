import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/shared/lib/three/environment-materials'
import type { Ref } from 'react'

interface TopHeaderProps {
  isCatalogDrawerOpen: boolean
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
  | 'isCatalogDrawerOpen'
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
  onShareSceneUrl: () => Promise<'shared' | 'copied' | null>
}

export interface TopHeaderContainerProps extends TopHeaderShellProps {
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
}
