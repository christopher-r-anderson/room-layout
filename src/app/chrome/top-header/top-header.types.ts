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
  onOpenKeyboardShortcutsFromHeaderMoreActions: () => void
  onOpenStartOverFromHeaderMoreActions: () => void
  onOpenProjectInfoFromHeaderMoreActions: () => void
}

export interface TopHeaderDesktopProps extends TopHeaderToolbarProps {
  isRoomSurfaceOpen: boolean
  isKeyboardShortcutsOpen: boolean
  isProjectInfoOpen: boolean
}
