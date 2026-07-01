// The single global Lingui instance. Non-React code (Zustand action files that
// build announcements/toasts) translates `msg` descriptors through this at
// fire-time via `i18n._(...)`; React code uses <Trans>/useLingui from
// @lingui/react. Everything routes through this module so there is one owner.
export { i18n } from '@lingui/core'
