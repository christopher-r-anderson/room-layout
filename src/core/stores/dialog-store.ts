import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { EqualityChecker } from '../types/store.types'
import type {
  DialogDefinition,
  DialogId,
  DialogKind,
  DialogRuntimeContext,
} from '../dialog-contract'

interface ActiveSurfaceState<TPayload = unknown> {
  id: DialogId
  kind: DialogKind
  payload: TPayload | null
}

interface DialogStoreState {
  activeSurface: ActiveSurfaceState | null
  runtimeContext: DialogRuntimeContext | null
  registry: Partial<Record<DialogId, DialogDefinition>>
  configureRuntimeContext: (context: DialogRuntimeContext) => void
  registerDialogDefinitions: (definitions: DialogDefinition[]) => void
  openDialog: (id: DialogId) => boolean
  setDialogOpen: (id: DialogId, open: boolean) => boolean
  closeActiveDialog: () => void
  isDialogOpen: (id: DialogId) => boolean
  reset: () => void
}

function getInitialDialogStoreState(): Pick<
  DialogStoreState,
  'activeSurface' | 'runtimeContext' | 'registry'
> {
  return {
    activeSurface: null,
    runtimeContext: null,
    registry: {},
  }
}

function resolveActiveSurface(
  definition: DialogDefinition,
  context: DialogRuntimeContext,
): ActiveSurfaceState {
  const payload = definition.getPayload ? definition.getPayload(context) : null

  return {
    id: definition.id,
    kind: definition.kind,
    payload,
  }
}

function createDialogStore() {
  return createStore<DialogStoreState>()(
    subscribeWithSelector((set, get) => ({
      ...getInitialDialogStoreState(),
      configureRuntimeContext: (context) => {
        set((state) => {
          if (state.runtimeContext === context) {
            return state
          }

          return {
            ...state,
            runtimeContext: context,
          }
        })
      },
      registerDialogDefinitions: (definitions) => {
        set((state) => {
          let changed = false
          const nextRegistry = { ...state.registry }

          for (const definition of definitions) {
            if (nextRegistry[definition.id] === definition) {
              continue
            }

            nextRegistry[definition.id] = definition
            changed = true
          }

          if (!changed) {
            return state
          }

          return {
            ...state,
            registry: nextRegistry,
          }
        })
      },
      openDialog: (id) => {
        const state = get()
        const definition = state.registry[id]
        const context = state.runtimeContext

        if (!definition || !context) {
          return false
        }

        // Keep dialog readiness as the single store-level global gate.
        if (!context.isDialogsEnabled()) {
          return false
        }

        if (definition.canOpen && !definition.canOpen(context)) {
          return false
        }

        const nextActiveSurface = resolveActiveSurface(definition, context)

        set((currentState) => ({
          ...currentState,
          activeSurface: nextActiveSurface,
        }))

        return true
      },
      setDialogOpen: (id, open) => {
        if (!open) {
          set((state) => {
            if (state.activeSurface?.id !== id) {
              return state
            }

            return {
              ...state,
              activeSurface: null,
            }
          })
          return true
        }

        return get().openDialog(id)
      },
      closeActiveDialog: () => {
        set((state) => {
          if (state.activeSurface === null) {
            return state
          }

          return {
            ...state,
            activeSurface: null,
          }
        })
      },
      isDialogOpen: (id) => {
        return get().activeSurface?.id === id
      },
      reset: () => {
        set((state) => ({
          ...state,
          ...getInitialDialogStoreState(),
        }))
      },
    })),
  )
}

const dialogStore = createDialogStore()

function useDialogStore<T>(
  selector: (state: DialogStoreState) => T,
  equalityFn?: EqualityChecker<T>,
) {
  return useStoreWithEqualityFn(dialogStore, selector, equalityFn)
}

export const dialogActions = {
  configureRuntimeContext: (context: DialogRuntimeContext) => {
    dialogStore.getState().configureRuntimeContext(context)
  },
  registerDialogDefinitions: (definitions: DialogDefinition[]) => {
    dialogStore.getState().registerDialogDefinitions(definitions)
  },
  openDialog: (id: DialogId) => {
    return dialogStore.getState().openDialog(id)
  },
  setDialogOpen: (id: DialogId, open: boolean) => {
    return dialogStore.getState().setDialogOpen(id, open)
  },
  closeActiveDialog: () => {
    dialogStore.getState().closeActiveDialog()
  },
  isDialogOpen: (id: DialogId) => {
    return dialogStore.getState().isDialogOpen(id)
  },
  reset: () => {
    dialogStore.getState().reset()
  },
}

export function resetDialogStore() {
  dialogActions.reset()
}

export const useDialogOpen = (id: DialogId) =>
  useDialogStore((state) => state.activeSurface?.id === id)

export const useDialogPayload = (id: DialogId) =>
  useDialogStore((state) => {
    if (state.activeSurface?.id !== id) {
      return null
    }

    return state.activeSurface.payload
  })

export const useIsBlockingOverlayOpen = () =>
  useDialogStore((state) => state.activeSurface?.kind === 'blocking')

export function isBlockingOverlayOpen() {
  return dialogStore.getState().activeSurface?.kind === 'blocking'
}

/**
 * Subscribe to blocking-overlay open/close transitions. The listener receives
 * the current and previous open state, so callers can act on a specific edge.
 */
export function subscribeToBlockingOverlay(
  listener: (isOpen: boolean, wasOpen: boolean) => void,
): () => void {
  return dialogStore.subscribe(
    (state) => state.activeSurface?.kind === 'blocking',
    listener,
  )
}

export const dialogStoreForTests = {
  getState: () => dialogStore.getState(),
}
