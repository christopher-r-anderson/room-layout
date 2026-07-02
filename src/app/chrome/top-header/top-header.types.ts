interface TopHeaderToolbarProps {
  history: {
    canRedo: boolean
    canUndo: boolean
  }
  startOverDisabled: boolean
}

export interface TopHeaderMobileProps extends TopHeaderToolbarProps {
  isRoomSurfaceOpen: boolean
  isHeaderMoreActionsOpen: boolean
  blockingOverlayOpen: boolean
}

export interface TopHeaderDesktopProps extends TopHeaderToolbarProps {
  isRoomSurfaceOpen: boolean
  isKeyboardShortcutsOpen: boolean
  isProjectInfoOpen: boolean
}
