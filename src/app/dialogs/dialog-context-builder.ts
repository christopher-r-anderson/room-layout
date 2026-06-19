import type { DialogRuntimeContext } from '@/editor-state/dialog-contract'
import { editorRuntimeStore } from '@/editor-state/editor-runtime-store'
import { sceneStateStore } from '@/editor-state/scene-state-store'

interface BuildDialogRuntimeContextOptions {
  canStartOver: () => boolean
}

function getSelectedFurnitureFromState() {
  const state = sceneStateStore.getState()

  if (state.selectedId === null) {
    return null
  }

  return (
    state.history.present.find((item) => item.id === state.selectedId) ?? null
  )
}

export function buildDialogRuntimeContext(
  options: BuildDialogRuntimeContextOptions,
): DialogRuntimeContext {
  return {
    isDialogsEnabled: () =>
      editorRuntimeStore.getState().startupPhase === 'ready',
    getSelectedFurniture: () => getSelectedFurnitureFromState(),
    canStartOver: () => options.canStartOver(),
  }
}
