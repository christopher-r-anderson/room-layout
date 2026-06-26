import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/domain/environment-materials'
import type { Ref } from 'react'

interface TopHeaderProps {
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
  topHeaderRef?: Ref<HTMLDivElement>
  desktopRoomSidebarRef?: Ref<HTMLElement>
  mobileRoomDrawerRef?: Ref<HTMLDivElement>
  wallFinishId: string
  wallFinishes: WallFinishOption[]
  onWallFinishChange: (finishId: string) => void
}

type TopHeaderToolbarProps = Pick<
  TopHeaderProps,
  | 'editorInteractionsEnabled'
  | 'floorFinishId'
  | 'floorFinishLoading'
  | 'floorFinishes'
  | 'history'
  | 'onFloorFinishChange'
  | 'startOverDisabled'
  | 'onWallFinishChange'
  | 'wallFinishId'
  | 'wallFinishes'
>

export interface TopHeaderContainerProps {
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
