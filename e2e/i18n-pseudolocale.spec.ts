import AxeBuilder from '@axe-core/playwright'
import { expect, test } from '@playwright/test'

const WCAG_AA_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']

// Locale-agnostic readiness: the shared harness waits on the English "Add
// Furniture" button name, which is pseudo-localized here, so we poll the test
// API's assetsReady flag instead.
async function waitForEditorReadyAnyLocale(
  page: import('@playwright/test').Page,
) {
  await page.waitForFunction(
    () => {
      const api = (
        globalThis as {
          __ROOM_LAYOUT_TEST__?: { getState: () => { assetsReady: boolean } }
        }
      ).__ROOM_LAYOUT_TEST__
      return api?.getState().assetsReady === true
    },
    undefined,
    { timeout: 30_000 },
  )
}

// Loading the editor under the `en-XA` pseudo-locale exercises the i18n pipeline:
// per-locale catalog code-splitting and dynamic activation, that every visible
// string routes through Lingui (an unwrapped one shows as plain ASCII English),
// and that the layout survives the length expansion (short labels ~2x+).

// The pseudo-locale replaces ASCII letters with accented Latin-Extended forms.
const ACCENTED_LATIN = /[\u00C0-\u024F]/

test.describe('pseudo-locale', () => {
  test('activates the split en-XA catalog and survives length expansion', async ({
    page,
  }) => {
    await page.goto('/?lang=en-XA')
    await waitForEditorReadyAnyLocale(page)

    // The lazily-imported pseudo catalog activated and reflected on <html>.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-XA')

    // An accessible name is accented, confirming strings resolve through the
    // catalog rather than falling back to English.
    await expect(
      page.getByRole('region', { name: ACCENTED_LATIN }).first(),
    ).toBeVisible()

    // No untranslated leaks: a representative visible label must not survive verbatim
    // - if it does, that string bypassed Lingui.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Add Furniture')
    expect(bodyText).toMatch(ACCENTED_LATIN)

    // Length expansion must not introduce horizontal document overflow on this
    // full-viewport app (a DOM measurement, not a pixel diff).
    const horizontalOverflow = await page.evaluate(() => {
      const el = document.scrollingElement ?? document.documentElement
      return el.scrollWidth - el.clientWidth
    })
    expect(horizontalOverflow).toBeLessThanOrEqual(1)

    // Accessibility conformance holds under the expanded, accented locale.
    const axeResult = await new AxeBuilder({ page })
      .withTags(WCAG_AA_TAGS)
      .analyze()
    expect(
      axeResult.violations,
      'Expected no axe violations under the en-XA pseudo-locale',
    ).toEqual([])
  })
})
