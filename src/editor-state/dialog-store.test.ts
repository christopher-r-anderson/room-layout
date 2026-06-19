// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { DIALOG_IDS } from './dialog-contract'
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
      id: DIALOG_IDS.delete,
      kind: 'blocking',
    },
    {
      id: DIALOG_IDS.roomSurface,
      kind: 'non-blocking',
    },
  ])
})

describe('dialogStore', () => {
  it('tracks a single active surface and blocking state by dialog kind', () => {
    const { result: activeSurface } = renderHook(() => useActiveSurface())
    const { result: isDeleteOpen } = renderHook(() =>
      useDialogOpen(DIALOG_IDS.delete),
    )
    const { result: isBlocking } = renderHook(() => useIsBlockingOverlayOpen())

    expect(activeSurface.current).toBeNull()
    expect(isDeleteOpen.current).toBe(false)
    expect(isBlocking.current).toBe(false)

    act(() => {
      dialogActions.openDialog(DIALOG_IDS.delete)
    })

    expect(activeSurface.current?.id).toBe(DIALOG_IDS.delete)
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
      dialogActions.openDialog(DIALOG_IDS.roomSurface, {
        payload: { layout: 'desktop' },
        returnFocusAccessPoint: 'top-header-room',
      })
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
      id: DIALOG_IDS.delete,
      kind: 'blocking',
    })

    const opened = dialogActions.openDialog(DIALOG_IDS.delete)

    expect(opened).toBe(false)
    expect(dialogActions.isDialogOpen(DIALOG_IDS.delete)).toBe(false)
  })
})
