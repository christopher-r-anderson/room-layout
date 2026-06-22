// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { resetDialogStore } from '@/editor-state/dialog-store'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/editor-state/editor-runtime-store'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import {
  resetSceneAssetsStore,
  sceneAssetsActions,
} from '@/editor-state/scene-assets-store'
import type { EnvironmentMaterialConfig } from '@/shared/lib/three/environment-materials'
import { TopHeader } from './top-header'
import type {
  TopHeaderDesktopProps,
  TopHeaderMobileProps,
} from './top-header.types'

const ENVIRONMENT: EnvironmentMaterialConfig = {
  defaultFloorFinishId: 'wood-floor',
  defaultWallFinishId: 'light-gray',
  floorFinishes: [
    {
      id: 'wood-floor',
      label: 'Wood',
      diffusePath: '/textures/wood.jpg',
      normalPath: '/textures/wood-normal.png',
      tileSizeMeters: { width: 0.5, depth: 0.5 },
    },
  ],
  wallFinishes: [
    {
      id: 'light-gray',
      label: 'Light Gray',
      color: 0xf5f5f5,
    },
  ],
}

vi.mock('@/features/shell/use-header-layout-mode', () => ({
  useHeaderLayoutMode: () => 'desktop' as const,
}))

vi.mock('./top-header-desktop', () => ({
  TopHeaderDesktop: (props: TopHeaderDesktopProps) => (
    <div>
      <span data-testid="floor-finish-id">{props.floorFinishId}</span>
      <span data-testid="wall-finish-id">{props.wallFinishId}</span>
    </div>
  ),
}))

vi.mock('./top-header-mobile', () => ({
  TopHeaderMobile: (props: TopHeaderMobileProps) => (
    <div>
      <span data-testid="floor-finish-id">{props.floorFinishId}</span>
      <span data-testid="wall-finish-id">{props.wallFinishId}</span>
    </div>
  ),
}))

vi.mock('@/features/keyboard/keyboard-shortcuts-help', () => ({
  KeyboardShortcutsDialog: () => null,
}))

vi.mock('@/features/project-info/project-info-dialog', () => ({
  ProjectInfoDialog: () => null,
}))

vi.mock('@/features/selection/start-over-confirmation-dialog', () => ({
  StartOverConfirmationDialog: () => null,
}))

function renderTopHeader() {
  return render(
    <TopHeader
      onConfirmStartOver={vi.fn()}
      onOpenStartOverDialog={vi.fn()}
      onShareSceneUrl={vi.fn(() =>
        Promise.resolve<'shared' | 'copied' | null>(null),
      )}
    />,
  )
}

describe('TopHeader', () => {
  beforeEach(() => {
    resetDialogStore()
    resetEditorRuntimeStore()
    sceneStateActions.resetSceneState()
    resetSceneAssetsStore()
    sceneAssetsActions.setSceneAssets({
      catalog: [],
      collections: [],
      environmentConfig: ENVIRONMENT,
    })
    editorRuntimeActions.markAssetsReady()
  })

  it('passes active default finish ids to header layouts when stored ids are invalid', () => {
    sceneStateActions.setFloorFinishId('missing-floor')
    sceneStateActions.setWallFinishId('missing-wall')

    renderTopHeader()

    expect(screen.getByTestId('floor-finish-id')).toHaveTextContent(
      'wood-floor',
    )
    expect(screen.getByTestId('wall-finish-id')).toHaveTextContent('light-gray')
  })
})
