export function runStartupAssetErrorTransition(
  error: Error,
  options: {
    closeOpenDialogs: () => void
    recordAssetError: (error: Error) => void
    resetEditorShellState: () => void
  },
) {
  options.recordAssetError(error)
  options.closeOpenDialogs()
  options.resetEditorShellState()
}

export function runStartupRetryTransition(options: {
  closeOpenDialogs: () => void
  resetEditorShellState: () => void
  retryAssetLoading: () => void
}) {
  options.closeOpenDialogs()
  options.resetEditorShellState()
  options.retryAssetLoading()
}
