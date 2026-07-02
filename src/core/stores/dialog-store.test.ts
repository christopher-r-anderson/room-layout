// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  dialogActions,
  resetDialogStore,
  useActiveSurface,
  useDialogOpen,
  useIsBlockingOverlayOpen,
} from './dialog-store'

beforeEach(() => {
  resetDialogStore()
  dialogActions.configureRuntimeContext({
    isDialogsEnabled: () => true,
    getSelectedFurniture: () => null,
    canStartOver: () => true,
  })

  dialogActions.registerDialogDefinitions([
    {
      id: 'delete',
      kind: 'blocking',
    },
    {
      id: 'room-surface',
      kind: 'non-blocking',
    },
  ])
})

describe('dialogStore', () => {
  it('tracks a single active surface and blocking state by dialog kind', () => {
    const { result: activeSurface } = renderHook(() => useActiveSurface())
    const { result: isDeleteOpen } = renderHook(() => useDialogOpen('delete'))
    const { result: isBlocking } = renderHook(() => useIsBlockingOverlayOpen())

    expect(activeSurface.current).toBeNull()
    expect(isDeleteOpen.current).toBe(false)
    expect(isBlocking.current).toBe(false)

    act(() => {
      dialogActions.openDialog('delete')
    })

    expect(activeSurface.current?.id).toBe('delete')
    expect(isDeleteOpen.current).toBe(true)
    expect(isBlocking.current).toBe(true)

    act(() => {
      dialogActions.closeActiveDialog()
    })

    expect(activeSurface.current).toBeNull()
    expect(isDeleteOpen.current).toBe(false)
    expect(isBlocking.current).toBe(false)
  })

  it('keeps blocking-overlay selector false for non-blocking room surface', () => {
    const { result } = renderHook(() => useIsBlockingOverlayOpen())

    act(() => {
      dialogActions.openDialog('room-surface')
    })

    expect(result.current).toBe(false)
  })

  it('enforces dialog readiness as a store-level global gate', () => {
    resetDialogStore()
    dialogActions.configureRuntimeContext({
      isDialogsEnabled: () => false,
      getSelectedFurniture: () => null,
      canStartOver: () => true,
    })
    dialogActions.registerDialogDefinition({
      id: 'delete',
      kind: 'blocking',
    })

    const opened = dialogActions.openDialog('delete')

    expect(opened).toBe(false)
    expect(dialogActions.isDialogOpen('delete')).toBe(false)
  })
})
