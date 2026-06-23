import type { DialogRuntimeContext } from '@/core/dialog-contract'
import { dialogActions } from '@/core/stores/dialog-store'
import { editorLifecycleStore } from '@/core/stores/editor-lifecycle-store'
import { sceneStateStore } from '@/core/stores/scene-state-store'
import { DIALOG_DEFINITIONS } from './dialog-registry'

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
      editorLifecycleStore.getState().startupPhase === 'ready',
    getSelectedFurniture: () => getSelectedFurnitureFromState(),
    canStartOver: () => options.canStartOver(),
  }
}

let registryBootstrapped = false

export function bootstrapDialogRegistry(context: DialogRuntimeContext) {
  dialogActions.configureRuntimeContext(context)

  if (registryBootstrapped) {
    return
  }

  dialogActions.registerDialogDefinitions(DIALOG_DEFINITIONS)
  registryBootstrapped = true
}

export function resetDialogRegistryForTests() {
  registryBootstrapped = false
}
