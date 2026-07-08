import { expect, type Locator, type Page } from '@playwright/test'

export type ToastIntent = 'success' | 'info' | 'warning' | 'error'

/** The toast viewport: a region landmark labeled "Notifications". */
function toastViewport(page: Page): Locator {
  return page.getByRole('region', { name: 'Notifications' })
}

/**
 * Waits for a visible toast matching the text (and intent, via the toast
 * root's `data-type`) and returns its locator. Read-only: never hovers the
 * viewport, since hovering pauses toast auto-dismiss timers.
 */
export async function waitForToast(
  page: Page,
  match: { text: string | RegExp; type?: ToastIntent },
): Promise<Locator> {
  // Direct children only: Base UI mirrors data-type onto title/description
  // parts, so a descendant match would also catch those.
  const toast = toastViewport(page)
    .locator(match.type ? `> [data-type="${match.type}"]` : '> [data-type]')
    .filter({ hasText: match.text })
  await expect(toast).toBeVisible()
  return toast
}
