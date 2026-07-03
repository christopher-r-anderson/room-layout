/* eslint-disable react-refresh/only-export-components -- test-only render helper, not part of HMR */
import type { ReactElement, ReactNode } from 'react'
import {
  act,
  render as rtlRender,
  type RenderOptions,
} from '@testing-library/react'
import { I18nProvider } from '@lingui/react'
import { i18n } from '@/shared/i18n/i18n'

// Component tests render through this so <Trans>/useLingui have their LinguiContext.
// The global i18n is loaded/activated with English in vitest.setup, so rendered
// output is source English. Re-exports the rest of Testing Library unchanged.
function AllProviders({ children }: { children: ReactNode }) {
  return <I18nProvider i18n={i18n}>{children}</I18nProvider>
}

function render(ui: ReactElement, options?: Omit<RenderOptions, 'wrapper'>) {
  return rtlRender(ui, { wrapper: AllProviders, ...options })
}

// Runs an optional synchronous interaction and then drains the microtask queue,
// all inside act, so state updates deferred via queueMicrotask (e.g. Base UI
// ScrollArea's mount-time thumb measurement) commit wrapped instead of firing
// after a synchronous interaction as "not wrapped in act(...)" warnings that
// also leak into later test files. Pass the interaction (rather than running it
// before calling) when it is what schedules the deferred update, so its
// scheduling happens within act's tracking.
async function flushMicrotasks(interaction?: () => void) {
  await act(async () => {
    interaction?.()
    await Promise.resolve()
  })
}

export * from '@testing-library/react'
export { render, flushMicrotasks }
