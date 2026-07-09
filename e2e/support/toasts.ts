import { expect, type Locator, type Page } from '@playwright/test'

export type ToastIntent = 'success' | 'warning' | 'error'

/** The toast viewport: a region landmark labeled "Notifications". */
export function toastViewport(page: Page): Locator {
  return page.getByRole('region', { name: 'Notifications' })
}

/** All toast roots: the viewport's direct `data-type` children. */
export function toastRoots(page: Page): Locator {
  return toastViewport(page).locator('> [data-type]')
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

/** Asserts the viewport holds no toasts. */
export async function expectNoToasts(page: Page): Promise<void> {
  await expect(toastRoots(page)).toHaveCount(0)
}

/**
 * Reads every toast root's full text (title plus description), including
 * hidden over-limit data-limited placeholders.
 */
export async function readToastTexts(page: Page): Promise<string[]> {
  return toastRoots(page).allTextContents()
}

/**
 * Dismisses one toast through the keyboard path and waits for it to leave the
 * stack. Two Base UI mechanics shape this helper:
 *
 * - High-priority (error) toast roots are `aria-hidden` while the viewport is
 *   unfocused (their SR path is Base UI's hidden `role="alert"` mirror), so
 *   the Close button inside them is not role-queryable until the viewport is
 *   focused - press F6 (Base UI's global listener) first. No modal may hold
 *   focus when this runs: a drawer's focus trap wins over F6.
 * - Only keyboard activation of the Close button returns focus to the element
 *   that was focused before F6 entered the viewport; a pointer click drops
 *   focus to `document.body`. Dismissing via `press('Enter')` keeps the
 *   helper's focus outcome deterministic for callers that assert it.
 */
export async function dismissToast(page: Page, toast: Locator): Promise<void> {
  const viewport = toastViewport(page)
  const viewportHasFocus = await viewport.evaluate(
    (element) =>
      element === document.activeElement ||
      element.contains(document.activeElement),
  )

  if (!viewportHasFocus) {
    await page.keyboard.press('F6')
    await expect(viewport).toBeFocused()
  }

  // Assert removal via the root count, not `toast` visibility: a positional
  // locator (e.g. `.first()`) re-resolves to the next remaining toast once
  // the dismissed one leaves the DOM and would never read as hidden.
  const rootCountBefore = await toastRoots(page).count()
  await toast.getByRole('button', { name: 'Close notification' }).press('Enter')
  await expect(toastRoots(page)).toHaveCount(rootCountBefore - 1)
}
