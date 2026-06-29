// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDialogStore } from '@/core/stores/dialog-store'
import {
  editorLifecycleActions,
  resetEditorLifecycleStore,
} from '@/core/stores/editor-lifecycle-store'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { CommandDispatchProvider } from '@/core/commands/command-dispatch-provider'
import { TopHeader } from './top-header'

vi.mock('@/shared/layout/use-header-layout-mode', () => ({
  useHeaderLayoutMode: () => 'desktop' as const,
}))

vi.mock('./top-header-desktop', () => ({
  TopHeaderDesktop: () => <div data-testid="desktop-header" />,
}))

vi.mock('./top-header-mobile', () => ({
  TopHeaderMobile: () => <div data-testid="mobile-header" />,
}))

vi.mock('@/features/keyboard/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsDialog: () => null,
}))

vi.mock('@/features/project-info/project-info-dialog', () => ({
  ProjectInfoDialog: () => null,
}))

vi.mock('@/features/startup/start-over-confirmation-dialog', () => ({
  StartOverConfirmationDialog: () => null,
}))

function renderTopHeader() {
  return render(
    <CommandDispatchProvider value={vi.fn()}>
      <TopHeader />
    </CommandDispatchProvider>,
  )
}

describe('TopHeader', () => {
  beforeEach(() => {
    resetDialogStore()
    resetEditorLifecycleStore()
    sceneDocumentActions.resetSceneDocument()
    editorLifecycleActions.markAssetsReady()
  })

  it('renders the layout for the active header layout mode', () => {
    renderTopHeader()

    expect(screen.getByTestId('desktop-header')).toBeInTheDocument()
    expect(screen.queryByTestId('mobile-header')).not.toBeInTheDocument()
  })
})
