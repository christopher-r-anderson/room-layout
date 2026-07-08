import { Toast } from '@base-ui/react/toast'

/**
 * Module-level manager so plain functions (operations, feature actions) can
 * raise toasts without React. The app shell passes this instance to
 * `AppToaster`, whose provider subscribes to it. Toast `type` is the intent
 * ('success' | 'info' | 'warning' | 'error'), mapped to icon + accent styling
 * by the viewport and mirrored onto the toast root as `data-type` for e2e.
 */
export const appToastManager = Toast.createToastManager()
