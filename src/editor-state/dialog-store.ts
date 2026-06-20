import { useStoreWithEqualityFn } from 'zustand/traditional'
import { subscribeWithSelector } from 'zustand/middleware'
import { createStore } from 'zustand/vanilla'
import type { EqualityChecker } from './store-types'
import type {
  DialogDefinition,
  DialogId,
  DialogKind,
  DialogOpenRequest,
  DialogRuntimeContext,
} from './dialog-contract'

export interface ActiveSurfaceState<TPayload = unknown> {
  id: DialogId
  kind: DialogKind
  payload: TPayload | null
}

interface DialogStoreState {
  activeSurface: ActiveSurfaceState | null
  runtimeContext: DialogRuntimeContext | null
  registry: Partial<Record<DialogId, DialogDefinition>>
  configureRuntimeContext: (context: DialogRuntimeContext) => void
  registerDialogDefinition: (definition: DialogDefinition) => void
  registerDialogDefinitions: (definitions: DialogDefinition[]) => void
  openDialog: (id: DialogId, request?: DialogOpenRequest) => boolean
  setDialogOpen: (
    id: DialogId,
    open: boolean,
    request?: DialogOpenRequest,
  ) => boolean
  closeActiveDialog: () => void
  isDialogOpen: (id: DialogId) => boolean
  reset: () => void
}

const INITIAL_DIALOG_STORE_STATE = {
  activeSurface: null,
  runtimeContext: null,
  registry: {},
} as const satisfies Pick<
  DialogStoreState,
  'activeSurface' | 'runtimeContext' | 'registry'
>

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
  request?: DialogOpenRequest,
): ActiveSurfaceState {
  const payload = definition.getPayload
    ? definition.getPayload(context, request)
    : (request?.payload ?? null)

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
      registerDialogDefinition: (definition) => {
        set((state) => {
          const current = state.registry[definition.id]

          if (current === definition) {
            return state
          }

          return {
            ...state,
            registry: {
              ...state.registry,
              [definition.id]: definition,
            },
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
      openDialog: (id, request) => {
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

        if (definition.canOpen && !definition.canOpen(context, request)) {
          return false
        }

        const nextActiveSurface = resolveActiveSurface(
          definition,
          context,
          request,
        )

        set((currentState) => ({
          ...currentState,
          activeSurface: nextActiveSurface,
        }))

        return true
      },
      setDialogOpen: (id, open, request) => {
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

        return get().openDialog(id, request)
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
  registerDialogDefinition: (definition: DialogDefinition) => {
    dialogStore.getState().registerDialogDefinition(definition)
  },
  registerDialogDefinitions: (definitions: DialogDefinition[]) => {
    dialogStore.getState().registerDialogDefinitions(definitions)
  },
  openDialog: (id: DialogId, request?: DialogOpenRequest) => {
    return dialogStore.getState().openDialog(id, request)
  },
  setDialogOpen: (id: DialogId, open: boolean, request?: DialogOpenRequest) => {
    return dialogStore.getState().setDialogOpen(id, open, request)
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

export const useActiveSurface = () =>
  useDialogStore((state) => state.activeSurface)

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

export const dialogStoreForTests = {
  getState: () => dialogStore.getState(),
}

export { INITIAL_DIALOG_STORE_STATE }
