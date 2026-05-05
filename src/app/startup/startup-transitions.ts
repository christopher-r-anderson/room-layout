export function runStartupAssetErrorTransition(
  error: Error,
  options: {
    closeAllDialogs: () => void
    recordAssetError: (error: Error) => void
    resetEditorShellState: () => void
  },
) {
  options.recordAssetError(error)
  options.closeAllDialogs()
  options.resetEditorShellState()
}

export function runStartupRetryTransition(options: {
  closeAllDialogs: () => void
  resetEditorShellState: () => void
  retryAssetLoading: () => void
}) {
  options.closeAllDialogs()
  options.resetEditorShellState()
  options.retryAssetLoading()
}
