import { create } from 'zustand'
import { subscribeWithSelector } from 'zustand/middleware'
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

// Module-private: features open/close through dialogActions and read through the
// narrow hooks below.
const useDialogStore = create<DialogStoreState>()(
  subscribeWithSelector(
    (): DialogStoreState => ({
      activeSurface: null,
      runtimeContext: null,
      registry: {},
    }),
  ),
)

export const dialogActions = {
  configureRuntimeContext: (context: DialogRuntimeContext) => {
    useDialogStore.setState((state) =>
      state.runtimeContext === context
        ? state
        : { ...state, runtimeContext: context },
    )
  },
  registerDialogDefinition: (definition: DialogDefinition) => {
    useDialogStore.setState((state) => {
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
  registerDialogDefinitions: (definitions: DialogDefinition[]) => {
    useDialogStore.setState((state) => {
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
  openDialog: (id: DialogId): boolean => {
    const state = useDialogStore.getState()
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

    useDialogStore.setState({ activeSurface: nextActiveSurface })

    return true
  },
  setDialogOpen: (id: DialogId, open: boolean): boolean => {
    if (!open) {
      useDialogStore.setState((state) => {
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

    return dialogActions.openDialog(id)
  },
  closeActiveDialog: () => {
    useDialogStore.setState((state) => {
      if (state.activeSurface === null) {
        return state
      }

      return {
        ...state,
        activeSurface: null,
      }
    })
  },
  isDialogOpen: (id: DialogId): boolean => {
    return useDialogStore.getState().activeSurface?.id === id
  },
  reset: () => {
    useDialogStore.setState(useDialogStore.getInitialState(), true)
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

export function isBlockingOverlayOpen() {
  return useDialogStore.getState().activeSurface?.kind === 'blocking'
}

/**
 * Subscribe to blocking-overlay open/close transitions. The listener receives
 * the current and previous open state, so callers can act on a specific edge.
 */
export function subscribeToBlockingOverlay(
  listener: (isOpen: boolean, wasOpen: boolean) => void,
): () => void {
  return useDialogStore.subscribe(
    (state) => state.activeSurface?.kind === 'blocking',
    listener,
  )
}

export const dialogStoreForTests = {
  getState: () => useDialogStore.getState(),
}
