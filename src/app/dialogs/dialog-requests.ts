export interface AppDialogOpenRequest<TPayload = unknown> {
  payload?: TPayload
}

/**
 * Shared contract for a dialog open-change handler: a single generic type
 * differentiated by its request payload.
 */
export type AppDialogOpenChange<TPayload = unknown> = (
  open: boolean,
  request?: AppDialogOpenRequest<TPayload>,
) => boolean
