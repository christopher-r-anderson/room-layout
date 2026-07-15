import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test, type Page } from '@playwright/test'
import { formatter } from '@lingui/format-po'
import {
  readPoliteAnnouncement,
  waitForEditorReadyAnyLocale,
} from './support/editor-harness'
import { expectNoA11yViolations } from './support/axe'

// Loading the editor under the `en-XA` pseudo-locale exercises the i18n pipeline:
// per-locale catalog code-splitting and dynamic activation, that every visible
// string and accessible name routes through Lingui (an unwrapped one shows as
// plain ASCII English), and that the layout survives the length expansion.

// The pseudo-locale replaces ASCII letters with accented Latin-Extended forms.
const ACCENTED_LATIN = /[À-ɏ]/

// Exact pseudo-translations resolved from the committed catalog, so the spec
// locates controls by accessible name without hardcoding generated text.
let pseudoCatalog: Record<string, string> = {}

test.beforeAll(async () => {
  const filename = path.resolve('src/shared/i18n/locales/en-XA.po')
  const fmt = formatter({ origins: false, lineNumbers: false })
  const catalog = await fmt.parse(readFileSync(filename, 'utf8'), {
    locale: 'en-XA',
    sourceLocale: 'en',
    filename,
  })
  pseudoCatalog = Object.fromEntries(
    Object.values(catalog).map((entry) => [
      entry.message ?? '',
      entry.translation ?? '',
    ]),
  )
})

function pseudo(source: string): string {
  const translation = pseudoCatalog[source]
  if (!translation) {
    throw new Error(`No en-XA catalog entry for "${source}"`)
  }
  return translation
}

// Manifest-provided labels (furniture names, environment finish labels) come
// from the catalog manifest, not the Lingui catalogs, and render in their
// manifest language under every locale (a documented boundary), so accessible
// names that are exactly a manifest label are exempt below.
const MANIFEST_PROVIDED_LABELS = (() => {
  const manifest = JSON.parse(
    readFileSync(path.resolve('public/catalog-manifest.json'), 'utf8'),
  ) as {
    catalog: { name: string }[]
    environment: Record<string, { label: string }[] | string>
  }
  const labels = manifest.catalog.map((entry) => entry.name)
  for (const value of Object.values(manifest.environment)) {
    if (Array.isArray(value)) {
      labels.push(...value.map((entry) => entry.label))
    }
  }
  return new Set(labels)
})()

// Every aria-label that carries words must be pseudo-localized. Labels are the
// strings no visual review sees, so this sweep is the regression net for them.
async function expectAriaLabelsLocalized(page: Page) {
  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('[aria-label]'), (element) =>
      element.getAttribute('aria-label'),
    ),
  )
  const unlocalized = labels.filter(
    (label): label is string =>
      label !== null &&
      /[A-Za-z]{2,}/.test(label) &&
      !ACCENTED_LATIN.test(label) &&
      !MANIFEST_PROVIDED_LABELS.has(label),
  )
  expect(unlocalized).toEqual([])
}

async function expectNoHorizontalOverflow(page: Page) {
  // Length expansion must not introduce horizontal document overflow on this
  // full-viewport app (a DOM measurement, not a pixel diff).
  const horizontalOverflow = await page.evaluate(() => {
    const el = document.scrollingElement ?? document.documentElement
    return el.scrollWidth - el.clientWidth
  })
  expect(horizontalOverflow).toBeLessThanOrEqual(1)
}

test.describe('pseudo-locale', () => {
  test('activates the split en-XA catalog and survives length expansion', async ({
    page,
  }) => {
    await page.goto('/?lang=en-XA')
    await waitForEditorReadyAnyLocale(page)

    // The lazily-imported pseudo catalog activated and reflected on <html>.
    await expect(page.locator('html')).toHaveAttribute('lang', 'en-XA')

    // A control resolves to its exact catalog translation, confirming strings
    // come from the split catalog rather than falling back to English.
    const addFurnitureButton = page.getByRole('button', {
      name: pseudo('Add Furniture'),
    })
    await expect(addFurnitureButton).toBeVisible()

    // No untranslated leaks: a representative visible label must not survive
    // verbatim - if it does, that string bypassed Lingui.
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('Add Furniture')
    expect(bodyText).toMatch(ACCENTED_LATIN)

    await expectAriaLabelsLocalized(page)
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'en-XA pseudo-locale: editor')

    // The catalog drawer: exercises drawer copy plus the per-entry footprint
    // labels, and the aria sweep now covers the manifest-name exemption.
    await addFurnitureButton.click()
    const catalogDrawer = page.getByRole('dialog', {
      name: pseudo('Add furniture'),
    })
    await expect(catalogDrawer).toBeVisible()
    await expectAriaLabelsLocalized(page)
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'en-XA pseudo-locale: catalog drawer')
    await page.keyboard.press('Escape')
    await expect(catalogDrawer).toBeHidden()

    // The room panel: picker headings/descriptions are localized while the
    // finish option labels are manifest-provided (exempt, documented boundary).
    await page.locator('button[aria-controls="room-surface"]').click()
    const roomSurface = page.getByRole('complementary', {
      name: pseudo('Room'),
    })
    await expect(roomSurface).toBeVisible()
    await expect(
      roomSurface.getByText(pseudo('Wall finish')).first(),
    ).toBeVisible()
    await expectAriaLabelsLocalized(page)
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'en-XA pseudo-locale: room panel')

    // The Size tab: field labels and description are Lingui strings. Keyboard
    // activation, since the rightmost tab can sit under the camera overlay.
    const sizeTab = roomSurface.getByRole('tab', { name: pseudo('Size') })
    await sizeTab.focus()
    await sizeTab.press('Enter')
    await expect(
      roomSurface.getByText(pseudo('Room size')).first(),
    ).toBeVisible()
    await expectAriaLabelsLocalized(page)
    await expectNoHorizontalOverflow(page)
    await expectNoA11yViolations(page, 'en-XA pseudo-locale: room size tab')
    await page.keyboard.press('Escape')
    await expect(roomSurface).toBeHidden()

    // The project info dialog: its attribution terms come from JSON-held labels
    // that must still route through the catalog.
    await page
      .getByRole('button', { name: pseudo('Open project and asset info') })
      .click()
    const infoDialog = page.getByRole('dialog', {
      name: pseudo('Project & Asset Info'),
    })
    await expect(infoDialog).toBeVisible()
    await expect(infoDialog.getByText(pseudo('Author')).first()).toBeVisible()
    expect(await infoDialog.innerText()).not.toContain('Author')
    await expectAriaLabelsLocalized(page)
    await expectNoA11yViolations(
      page,
      'en-XA pseudo-locale: project info dialog',
    )
  })

  test('feedback surfaces resolve their strings from the active catalog', async ({
    page,
  }) => {
    await page.goto('/?lang=en-XA')
    await waitForEditorReadyAnyLocale(page)

    // The toast viewport's accessible name is a Lingui string: Base UI's own
    // default is hardcoded English, so a plain "Notifications" here means the
    // label prop regressed off the catalog. The viewport is always mounted
    // (toasts or not), so assert attachment, not visibility.
    await expect(
      page.getByRole('region', { name: pseudo('Notifications') }),
    ).toBeAttached()

    // A focus command with no selection announces through the global polite
    // channel; the message must come from the catalog, not hardcoded English.
    // This is the only automated gate on that string staying localized.
    await page.keyboard.press('Shift+I')
    await expect
      .poll(async () => readPoliteAnnouncement(page))
      .toBe(pseudo('No item selected. Focus moved to Furniture in room.'))
  })
})
