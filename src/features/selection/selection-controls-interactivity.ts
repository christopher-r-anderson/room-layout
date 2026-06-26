export interface SelectionControlsInteractivity {
  disabled: boolean
  disabledMessage: string
}

// A blocking dialog (e.g. the catalog drawer) already neutralizes the selection
// controls by trapping focus and hiding the background, so the only state these
// controls own is the editor's loading lockout.
export function resolveSelectionControlsInteractivity({
  editorInteractionsEnabled,
}: {
  editorInteractionsEnabled: boolean
}): SelectionControlsInteractivity {
  if (!editorInteractionsEnabled) {
    return {
      disabled: true,
      disabledMessage: 'Editor interactions are unavailable while loading',
    }
  }

  return {
    disabled: false,
    disabledMessage: '',
  }
}
