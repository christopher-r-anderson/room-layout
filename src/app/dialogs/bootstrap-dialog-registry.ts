import type { DialogRuntimeContext } from '@/editor-state/dialog-contract'
import { dialogActions } from '@/editor-state/dialog-store'
import { DIALOG_DEFINITIONS } from './dialog-registry'

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
