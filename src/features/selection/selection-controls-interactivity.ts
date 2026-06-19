export interface SelectionControlsInteractivity {
  suppressed: boolean
  disabled: boolean
  disabledMessage: string
}

export function resolveSelectionControlsInteractivity({
  editorInteractionsEnabled,
  isCatalogDrawerOpen,
}: {
  editorInteractionsEnabled: boolean
  isCatalogDrawerOpen: boolean
}): SelectionControlsInteractivity {
  if (!editorInteractionsEnabled) {
    return {
      suppressed: isCatalogDrawerOpen,
      disabled: true,
      disabledMessage: 'Editor interactions are unavailable while loading',
    }
  }

  if (isCatalogDrawerOpen) {
    return {
      suppressed: true,
      disabled: true,
      disabledMessage: 'Close Add Furniture to edit selected item controls',
    }
  }

  return {
    suppressed: false,
    disabled: false,
    disabledMessage: '',
  }
}
