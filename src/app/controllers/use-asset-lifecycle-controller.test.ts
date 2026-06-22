// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  runStartupAssetErrorTransition,
  runStartupRetryTransition,
} from '@/features/startup/startup-transitions'
import { runStartupRestoreFlow } from './_shared/restore-flow'
import { announcementActions } from '@/editor-state/announcement-store'
import { selectionEffects } from '@/editor-state/selection-effects'
import { useAssetLifecycleController } from './use-asset-lifecycle-controller'

vi.mock('@/editor-state/selection-effects', () => ({
  selectionEffects: {
    notePendingSelection: vi.fn(),
    notePendingSource: vi.fn(),
    notePostDeleteOutlinerFocusIndex: vi.fn(),
    notePostDeleteFocusTarget: vi.fn(),
    consumePostDeleteFocusTarget: vi.fn(),
  },
}))

vi.mock('@/editor-state/announcement-store', () => ({
  announcementActions: {
    announcePolite: vi.fn(),
    announceAssertive: vi.fn(),
    clearAssertiveAnnouncement: vi.fn(),
    queueMovementAnnouncement: vi.fn(),
    clearQueuedMovementAnnouncement: vi.fn(),
  },
}))

vi.mock('@/features/startup/startup-transitions', () => ({
  runStartupAssetErrorTransition: vi.fn(),
  runStartupRetryTransition: vi.fn(),
}))

vi.mock('./_shared/restore-flow', () => ({
  runStartupRestoreFlow: vi.fn(),
}))

vi.mock('@/editor-state/scene-draft', () => ({
  loadSceneDraft: vi.fn().mockReturnValue(null),
  saveSceneDraft: vi.fn(),
}))

vi.mock('@/editor-state/scene-url', async () => {
  const actual = await vi.importActual<
    typeof import('@/editor-state/scene-url')
  >('@/editor-state/scene-url')
  return {
    ...actual,
    parseSceneUrl: vi.fn().mockReturnValue({ ok: false, reason: 'no-param' }),
    validateCatalogReferences: vi.fn().mockReturnValue(true),
  }
})

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    warning: vi.fn(),
    error: vi.fn(),
  },
}))

function createStartup() {
  return {
    catalog: [],
    defaultFloorFinishId: 'floor-default',
    defaultWallFinishId: 'wall-default',
    floorFinishIds: ['floor-default'],
    wallFinishIds: ['wall-default'],
    handleAssetError: vi.fn(),
    handleAssetsReady: vi.fn(),
    retryAssetLoading: vi.fn(),
    resetEditorShellState: vi.fn(),
  }
}

describe('useAssetLifecycleController', () => {
  beforeEach(() => {
    vi.mocked(runStartupAssetErrorTransition).mockReset()
    vi.mocked(runStartupRetryTransition).mockReset()
    vi.mocked(runStartupRestoreFlow).mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    vi.clearAllMocks()
  })

  it('routes asset errors through the startup transition and announces assertively', () => {
    const closeActiveDialog = vi.fn()
    const startup = createStartup()

    const { result } = renderHook(() =>
      useAssetLifecycleController({
        closeActiveDialog,
        startup,
      }),
    )

    act(() => {
      result.current.handleSceneAssetError(new Error('boom'))
    })

    expect(runStartupAssetErrorTransition).toHaveBeenCalledTimes(1)
    expect(announcementActions.announceAssertive).toHaveBeenCalledWith(
      'Unable to load room editor assets. Retry available.',
    )
  })

  it('runs the restore flow exactly once across multiple ready notifications', () => {
    const startup = createStartup()

    const { result } = renderHook(() =>
      useAssetLifecycleController({
        closeActiveDialog: vi.fn(),
        startup,
      }),
    )

    act(() => {
      result.current.handleSceneAssetsReady()
      result.current.handleSceneAssetsReady()
    })

    expect(runStartupRestoreFlow).toHaveBeenCalledTimes(1)
    expect(startup.handleAssetsReady).toHaveBeenCalledTimes(2)
    expect(selectionEffects.notePendingSelection).toHaveBeenCalledWith({
      announceMode: 'suppress',
      requestOutlinerFocus: false,
    })
  })

  it('clears the assertive announcement when retrying asset load', () => {
    const startup = createStartup()

    const { result } = renderHook(() =>
      useAssetLifecycleController({
        closeActiveDialog: vi.fn(),
        startup,
      }),
    )

    act(() => {
      result.current.handleRetryAssetLoading()
    })

    expect(runStartupRetryTransition).toHaveBeenCalledTimes(1)
    expect(
      announcementActions.clearAssertiveAnnouncement,
    ).toHaveBeenCalledTimes(1)
  })
})
