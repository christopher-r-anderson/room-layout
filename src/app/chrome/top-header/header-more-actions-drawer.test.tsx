// @vitest-environment jsdom

import { render, screen } from '@/test/render'
import { beforeEach, expect, it, vi } from 'vitest'
import { HeaderMoreActionsDrawer } from './header-more-actions-drawer'
import { dialogActions, resetDialogStore } from '@/core/stores/dialog-store'
import { DIALOG_DEFINITIONS } from '@/app/dialogs/bootstrap-dialog-registry'
import { HEADER_MORE_ACTIONS_DIALOG_ID } from './header-more-actions-dialog-definition'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'

let sceneIsAtDefaults = true

vi.mock('@/core/operations/use-scene-is-at-defaults', () => ({
  useSceneIsAtDefaults: () => sceneIsAtDefaults,
}))

vi.mock('./share-scene-button', () => ({
  ShareSceneButton: () => <button type="button">Share room layout</button>,
}))

beforeEach(() => {
  resetDialogStore()
  sceneIsAtDefaults = true
})

function renderOpenDrawer() {
  dialogActions.registerDialogDefinitions(DIALOG_DEFINITIONS)
  dialogActions.configureRuntimeContext({
    isDialogsEnabled: () => true,
    getSelectedFurniture: () => null,
    canStartOver: () => !sceneIsAtDefaults,
  })
  dialogActions.openDialog(HEADER_MORE_ACTIONS_DIALOG_ID)

  return render(
    <CommandDispatchProvider value={vi.fn()}>
      <HeaderMoreActionsDrawer />
    </CommandDispatchProvider>,
  )
}

it('keeps a disabled Start Over focusable with a visible reason', () => {
  renderOpenDrawer()

  const startOver = screen.getByRole('button', { name: 'Start Over' })

  // Focusable-disabled, not native-disabled: still reachable by keyboard/AT.
  expect(startOver).not.toBeDisabled()
  expect(startOver).toHaveAttribute('aria-disabled', 'true')
  expect(startOver).toHaveAccessibleDescription(
    'Scene already matches defaults',
  )
  expect(screen.getByText('Scene already matches defaults')).toBeVisible()
})

it('drops the reason line and description once the scene diverges from defaults', () => {
  sceneIsAtDefaults = false
  renderOpenDrawer()

  const startOver = screen.getByRole('button', { name: 'Start Over' })

  expect(startOver).toHaveAttribute('aria-disabled', 'false')
  expect(startOver).not.toHaveAccessibleDescription()
  expect(
    screen.queryByText('Scene already matches defaults'),
  ).not.toBeInTheDocument()
})
