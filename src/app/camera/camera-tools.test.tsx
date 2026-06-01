// @vitest-environment jsdom

import { act, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  editorRuntimeActions,
  resetEditorRuntimeStore,
} from '@/editor-state/editor-runtime-store'
import {
  resetSceneStateStore,
  sceneStateActions,
} from '@/editor-state/scene-state-store'
import { CameraTools, ConnectedCameraTools } from './camera-tools'

describe('CameraTools', () => {
  beforeEach(() => {
    resetEditorRuntimeStore()
    resetSceneStateStore()
  })

  it('uses explicit props without relying on store state', () => {
    render(
      <CameraTools
        editorInteractionsEnabled={true}
        hasSelection={true}
        onSetPreset={vi.fn()}
        onFocusSelected={vi.fn()}
      />,
    )

    expect(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    ).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Focus Selected' })).toBeEnabled()
  })

  it('subscribes to editor stores in the connected variant', () => {
    render(
      <ConnectedCameraTools onSetPreset={vi.fn()} onFocusSelected={vi.fn()} />,
    )

    expect(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    ).toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('button', { name: 'Focus Selected' }),
    ).toHaveAttribute('aria-disabled', 'true')

    act(() => {
      editorRuntimeActions.markAssetsReady()
      sceneStateActions.setSelectedId('chair-1')
    })

    expect(
      screen.getByRole('button', { name: 'Switch to Corner view' }),
    ).not.toHaveAttribute('aria-disabled', 'true')
    expect(
      screen.getByRole('button', { name: 'Focus Selected' }),
    ).not.toHaveAttribute('aria-disabled', 'true')
  })
})
