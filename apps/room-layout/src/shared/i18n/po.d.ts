// `@lingui/vite-plugin` turns `.po` catalog imports into compiled messages.
declare module '*.po' {
  import type { Messages } from '@lingui/core'
  export const messages: Messages
}
