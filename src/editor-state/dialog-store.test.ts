// @vitest-environment jsdom

import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import {
  dialogActions,
  resetDialogStore,
  useIsBlockingOverlayOpen,
} from './dialog-store'

const LEATHER_COUCH: FurnitureItem = {
  id: 'leather-couch-1',
  catalogId: 'leather-couch',
  collectionId: 'leather-collection',
  footprintSize: { width: 2.4, depth: 0.9 },
  kind: 'couch',
  name: 'Leather Couch',
  nodeName: 'LeatherCouch',
  position: [0, 0, 0],
  rotationY: 0,
  sourcePath: '/models/leather-couch.glb',
}

beforeEach(() => {
  resetDialogStore()
})

describe('dialogStore', () => {
  it('useIsBlockingOverlayOpen reflects an active dialog', () => {
    const { result } = renderHook(() => useIsBlockingOverlayOpen())

    expect(result.current).toBe(false)

    act(() => {
      dialogActions.openDelete({
        editorInteractionsEnabled: true,
        selectedFurniture: LEATHER_COUCH,
      })
    })

    expect(result.current).toBe(true)

    act(() => {
      dialogActions.closeDialog()
    })

    expect(result.current).toBe(false)
  })

  it('useIsBlockingOverlayOpen stays false for a non-blocking room surface', () => {
    const { result } = renderHook(() => useIsBlockingOverlayOpen())

    act(() => {
      dialogActions.openRoomSurface({
        editorInteractionsEnabled: true,
        startupOverlayActive: false,
        dialogOptions: {
          layout: 'desktop',
          returnFocusTarget: 'room-inline',
        },
      })
    })

    // openRoomSurface clears activeDialog (room surface is not blocking).
    expect(result.current).toBe(false)
  })
})
