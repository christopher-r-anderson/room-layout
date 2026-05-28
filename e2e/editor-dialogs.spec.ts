import { expect, test, type Locator, type Page } from '@playwright/test'
import {
  addFurniture,
  openEditor,
  readSceneState,
  selectFurnitureById,
} from './support/editor-harness'

async function closeWithEscapeAndRestoreFocus(
  page: Page,
  dialog: Locator,
  focusTarget: Locator,
) {
  await page.keyboard.press('Escape')
  await expect(dialog).toBeHidden()
  await expect(focusTarget).toBeFocused()
}

test('project info dialog preserves repository metadata and returns focus', async ({
  page,
}) => {
  await openEditor(page)

  const infoButton = page.getByRole('button', {
    name: 'Open project and asset info',
  })

  await infoButton.click()

  const infoDialog = page.getByRole('dialog', { name: /project & asset info/i })
  await expect(infoDialog).toBeVisible()

  await expect(
    infoDialog.getByRole('heading', { name: 'Repository' }),
  ).toBeVisible()
  await expect(
    infoDialog.getByRole('link', { name: /christopher anderson/i }),
  ).toBeVisible()
  await expect(
    infoDialog.getByRole('link', {
      name: /github.com\/christopher-r-anderson\/room-layout/i,
    }),
  ).toBeVisible()
  await expect(infoDialog.getByRole('link', { name: /^mit/i })).toBeVisible()
  await expect(
    infoDialog.getByRole('heading', { name: 'Wood Floor Texture Set' }),
  ).toBeVisible()
  await expect(
    infoDialog.getByRole('link', { name: /^cc0/i }).first(),
  ).toBeVisible()

  await closeWithEscapeAndRestoreFocus(page, infoDialog, infoButton)
})

test('environment, sheet, and confirmation dialogs keep accessible contracts and return focus', async ({
  page,
}) => {
  await openEditor(page)

  const environmentButton = page.getByRole('button', { name: 'Environment' })
  await environmentButton.click()

  const environmentDialog = page.getByRole('dialog', { name: 'Environment' })
  await expect(environmentDialog).toBeVisible()
  await expect(
    environmentDialog.getByText(/choose the wall and floor finishes/i),
  ).toBeVisible()
  await closeWithEscapeAndRestoreFocus(
    page,
    environmentDialog,
    environmentButton,
  )

  const pickerTrigger = page.getByRole('button', { name: 'Add Furniture' })
  await pickerTrigger.click()

  const pickerSheet = page.getByRole('dialog', { name: 'Add furniture' })
  await expect(pickerSheet).toBeVisible()
  await closeWithEscapeAndRestoreFocus(page, pickerSheet, pickerTrigger)

  await addFurniture(page, 'Leather Couch')

  const deleteButton = page.getByRole('button', { name: 'Remove item' })
  await deleteButton.click()

  const deleteDialog = page.getByRole('alertdialog', {
    name: /remove item from room/i,
  })
  await expect(deleteDialog).toBeVisible()
  await expect(
    deleteDialog.getByText(/remove leather couch from your room layout\?/i),
  ).toBeVisible()

  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(deleteDialog).toBeHidden()
  await expect(deleteButton).toBeFocused()

  const newSceneButton = page.getByRole('button', {
    name: 'Start over',
  })
  await newSceneButton.click()

  const newSceneDialog = page.getByRole('alertdialog', {
    name: /start over\?/i,
  })
  await expect(newSceneDialog).toBeVisible()
  await expect(
    newSceneDialog.getByText(/restores the default room/i),
  ).toBeVisible()

  await newSceneDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(newSceneDialog).toBeHidden()
  await expect(newSceneButton).toBeFocused()
})

test('catalog, environment, delete, and info dialogs stay mutually exclusive', async ({
  page,
}) => {
  await openEditor(page)
  await addFurniture(page, 'Leather Couch')

  const sceneState = await readSceneState(page)
  const firstItemId = sceneState.items[0]?.id

  if (!firstItemId) {
    throw new Error('expected a furniture item to exist after adding it')
  }

  await selectFurnitureById(page, firstItemId)

  const catalogButton = page.getByRole('button', { name: 'Add Furniture' })
  const environmentButton = page.getByRole('button', { name: 'Environment' })
  const deleteButton = page.getByRole('button', { name: 'Remove item' })
  const infoButton = page.getByRole('button', {
    name: 'Open project and asset info',
  })
  const catalogDialog = page.getByRole('dialog', { name: 'Add furniture' })
  const environmentDialog = page.getByRole('dialog', { name: 'Environment' })
  const deleteDialog = page.getByRole('alertdialog', {
    name: /remove item from room/i,
  })
  const infoDialog = page.getByRole('dialog', { name: /project & asset info/i })

  await catalogButton.click()
  await expect(catalogDialog).toBeVisible()

  await page.keyboard.press('Delete')
  await expect(deleteDialog).toBeHidden()

  await page.keyboard.press('Escape')
  await expect(catalogDialog).toBeHidden()

  await environmentButton.click()
  await expect(environmentDialog).toBeVisible()

  await page.keyboard.press('Delete')
  await expect(deleteDialog).toBeHidden()

  await page.keyboard.press('Control+Alt+n')
  await expect(
    page.getByRole('alertdialog', { name: /start over\?/i }),
  ).toBeHidden()

  await closeWithEscapeAndRestoreFocus(
    page,
    environmentDialog,
    environmentButton,
  )

  await deleteButton.click()
  await expect(deleteDialog).toBeVisible()

  await expect(infoButton).toBeHidden()
  await expect(infoDialog).toBeHidden()

  await deleteDialog.getByRole('button', { name: 'Cancel' }).click()
  await expect(deleteDialog).toBeHidden()

  await infoButton.click()
  await expect(infoDialog).toBeVisible()

  await page.keyboard.press('Delete')
  await expect(deleteDialog).toBeHidden()

  await closeWithEscapeAndRestoreFocus(page, infoDialog, infoButton)
})

test.describe('narrow viewport more actions', () => {
  test.use({ viewport: { width: 390, height: 844 } })

  test('mobile More opens environment, keyboard shortcuts, and project info dialogs', async ({
    page,
  }) => {
    await openEditor(page)

    const moreButton = page.getByRole('button', { name: 'More actions' })
    const moreDialog = page.getByRole('dialog', { name: 'More actions' })

    await moreButton.click()
    await expect(moreDialog).toBeVisible()

    await moreDialog.getByRole('button', { name: 'Environment' }).click()

    const environmentDialog = page.getByRole('dialog', { name: 'Environment' })
    await expect(environmentDialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(environmentDialog).toBeHidden()
    await expect(moreButton).toBeFocused()

    await moreButton.click()
    await expect(moreDialog).toBeVisible()

    await moreDialog.getByRole('button', { name: 'Keyboard shortcuts' }).click()

    const shortcutsDialog = page.getByRole('dialog', {
      name: 'Keyboard Shortcuts',
    })
    await expect(shortcutsDialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(shortcutsDialog).toBeHidden()
    await expect(moreButton).toBeFocused()

    await moreButton.click()
    await expect(moreDialog).toBeVisible()

    await moreDialog.getByRole('button', { name: 'Project info' }).click()

    const infoDialog = page.getByRole('dialog', {
      name: /project & asset info/i,
    })
    await expect(infoDialog).toBeVisible()

    await page.keyboard.press('Escape')
    await expect(infoDialog).toBeHidden()
    await expect(moreButton).toBeFocused()
  })

  test('start over restores focus to a visible control after responsive header resizes', async ({
    page,
  }) => {
    await openEditor(page)
    await addFurniture(page, 'Leather Couch')

    const moreButton = page.getByRole('button', { name: 'More actions' })
    await moreButton.click()

    const moreDialog = page.getByRole('dialog', { name: 'More actions' })
    await expect(moreDialog).toBeVisible()

    await moreDialog.getByRole('button', { name: 'Start Over' }).click()

    const startOverDialog = page.getByRole('alertdialog', {
      name: /start over\?/i,
    })
    await expect(startOverDialog).toBeVisible()

    await page.setViewportSize({ width: 1024, height: 844 })

    const desktopStartOverButton = page.locator(
      '[aria-keyshortcuts="Control+Alt+N Meta+Alt+N"]',
    )
    await expect(desktopStartOverButton).toBeVisible()

    await startOverDialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(startOverDialog).toBeHidden()
    await expect(desktopStartOverButton).toBeFocused()

    await desktopStartOverButton.click()
    await expect(startOverDialog).toBeVisible()

    await page.setViewportSize({ width: 390, height: 844 })

    await startOverDialog.getByRole('button', { name: 'Cancel' }).click()
    await expect(startOverDialog).toBeHidden()
    await expect(moreButton).toBeFocused()
  })
})
