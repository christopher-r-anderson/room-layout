import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  ADD_FURNITURE_NO_SPACE_MESSAGE,
  ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
  DELETE_SELECTION_MISSING_MESSAGE,
} from './hooks/command-messages'
import { sceneStateActions } from '@/editor-state/scene-state-store'
import { sceneCommands } from '@/scene/scene-commands'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { createSceneCommandActions } from './scene-command-actions'

function createFurnitureItem(id: string): FurnitureItem {
  return {
    id,
    catalogId: 'catalog-chair',
    name: `Chair ${id}`,
    kind: 'armchair',
    collectionId: 'collection-1',
    nodeName: 'ChairNode',
    sourcePath: '/models/chair.glb',
    footprintSize: { width: 1, depth: 1 },
    position: [0, 0, 0],
    rotationY: 0,
  }
}

function mockSceneReady(ready: boolean) {
  return vi.spyOn(sceneCommands, 'isSceneReady').mockReturnValue(ready)
}

function createActions(
  options?: Partial<Parameters<typeof createSceneCommandActions>[0]>,
) {
  return createSceneCommandActions({
    catalogIdToAdd: 'leather-couch',
    editorInteractionsEnabled: true,
    rotationStepRadians: Math.PI / 12,
    ...options,
  })
}

describe('createSceneCommandActions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('maps add-furniture results through shared message constants', () => {
    mockSceneReady(true)
    const setEditorMessage = vi
      .spyOn(sceneStateActions, 'setEditorMessage')
      .mockImplementation(() => undefined)
    const clearEditorMessage = vi
      .spyOn(sceneStateActions, 'clearEditorMessage')
      .mockImplementation(() => undefined)
    const addFurniture = vi
      .spyOn(sceneCommands, 'addFurniture')
      .mockReturnValue({ ok: true, id: 'item-1' })

    expect(createActions().addFurniture()).toBe(true)
    expect(clearEditorMessage).toHaveBeenCalledTimes(1)

    addFurniture.mockReturnValueOnce({ ok: false, reason: 'no-space' })
    expect(createActions().addFurniture()).toBe(false)
    expect(setEditorMessage).toHaveBeenLastCalledWith(
      ADD_FURNITURE_NO_SPACE_MESSAGE,
    )

    addFurniture.mockReturnValueOnce({ ok: false, reason: 'unknown-catalog' })
    expect(
      createSceneCommandActions({
        catalogIdToAdd: 'missing-item',
        editorInteractionsEnabled: true,
        rotationStepRadians: Math.PI / 12,
      }).addFurniture(),
    ).toBe(false)
    expect(setEditorMessage).toHaveBeenLastCalledWith(
      ADD_FURNITURE_UNKNOWN_CATALOG_MESSAGE,
    )
  })

  it('maps delete results through the shared message constants', () => {
    mockSceneReady(true)
    const setEditorMessage = vi
      .spyOn(sceneStateActions, 'setEditorMessage')
      .mockImplementation(() => undefined)
    const clearEditorMessage = vi
      .spyOn(sceneStateActions, 'clearEditorMessage')
      .mockImplementation(() => undefined)
    const deleteSelection = vi
      .spyOn(sceneCommands, 'deleteSelection')
      .mockReturnValue(true)

    deleteSelection.mockReturnValueOnce(false)
    expect(createActions().confirmDeleteSelection()).toBe(false)
    expect(setEditorMessage).toHaveBeenLastCalledWith(
      DELETE_SELECTION_MISSING_MESSAGE,
    )

    deleteSelection.mockReturnValueOnce(true)
    expect(createActions().confirmDeleteSelection()).toBe(true)
    expect(clearEditorMessage).toHaveBeenCalledTimes(1)
  })

  it('does not invoke scene commands while interactions are disabled', () => {
    mockSceneReady(true)
    const clearSelection = vi
      .spyOn(sceneCommands, 'clearSelection')
      .mockImplementation(() => undefined)
    const addFurniture = vi
      .spyOn(sceneCommands, 'addFurniture')
      .mockReturnValue({ ok: true, id: 'item-1' })
    const moveSelection = vi
      .spyOn(sceneCommands, 'moveSelection')
      .mockReturnValue({ ok: true, position: [0.5, 0, 0] })
    const focusSelected = vi
      .spyOn(sceneCommands, 'focusSelected')
      .mockImplementation(() => undefined)
    const undo = vi.spyOn(sceneCommands, 'undo').mockReturnValue(true)
    const redo = vi.spyOn(sceneCommands, 'redo').mockReturnValue(true)
    const rotateSelection = vi
      .spyOn(sceneCommands, 'rotateSelection')
      .mockImplementation(() => undefined)
    const selectById = vi
      .spyOn(sceneCommands, 'selectById')
      .mockReturnValue({ ok: true, status: 'selected' })
    const setSelectionTransform = vi
      .spyOn(sceneCommands, 'setSelectionTransform')
      .mockReturnValue({ ok: false, reason: 'no-selection' })
    const setCameraPreset = vi
      .spyOn(sceneCommands, 'setCameraPreset')
      .mockImplementation(() => undefined)

    const actions = createActions({ editorInteractionsEnabled: false })

    expect(actions.addFurniture()).toBe(false)
    expect(
      actions.moveSelection({ x: 0.5, z: 0 }, { source: 'keyboard' }),
    ).toEqual({
      ok: false,
      reason: 'no-selection',
    })
    expect(actions.setSelectionTransform({ position: [1, 0, 0] })).toEqual({
      ok: false,
      reason: 'no-selection',
    })
    expect(actions.selectById('item-1')).toEqual({
      ok: false,
      status: 'not-found',
    })
    actions.clearSelection()
    actions.confirmDeleteSelection()
    actions.rotateSelection(1)
    actions.setCameraPreset('top')
    actions.focusSelected()
    actions.undo()
    actions.redo()

    expect(addFurniture).not.toHaveBeenCalled()
    expect(moveSelection).not.toHaveBeenCalled()
    expect(selectById).not.toHaveBeenCalled()
    expect(clearSelection).not.toHaveBeenCalled()
    expect(focusSelected).not.toHaveBeenCalled()
    expect(rotateSelection).not.toHaveBeenCalled()
    expect(setCameraPreset).not.toHaveBeenCalled()
    expect(setSelectionTransform).not.toHaveBeenCalled()
    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
  })

  it('safely no-ops when scene services are unavailable', () => {
    mockSceneReady(false)
    const setEditorMessage = vi
      .spyOn(sceneStateActions, 'setEditorMessage')
      .mockImplementation(() => undefined)
    const clearEditorMessage = vi
      .spyOn(sceneStateActions, 'clearEditorMessage')
      .mockImplementation(() => undefined)
    const addFurniture = vi
      .spyOn(sceneCommands, 'addFurniture')
      .mockReturnValue({ ok: true, id: 'item-1' })
    const deleteSelection = vi
      .spyOn(sceneCommands, 'deleteSelection')
      .mockReturnValue(true)
    const moveSelection = vi
      .spyOn(sceneCommands, 'moveSelection')
      .mockReturnValue({ ok: true, position: [0.5, 0, 0] })
    const focusSelected = vi
      .spyOn(sceneCommands, 'focusSelected')
      .mockImplementation(() => undefined)
    const undo = vi.spyOn(sceneCommands, 'undo').mockReturnValue(true)
    const redo = vi.spyOn(sceneCommands, 'redo').mockReturnValue(true)
    const rotateSelection = vi
      .spyOn(sceneCommands, 'rotateSelection')
      .mockImplementation(() => undefined)
    const selectById = vi
      .spyOn(sceneCommands, 'selectById')
      .mockReturnValue({ ok: true, status: 'selected' })
    const setSelectionTransform = vi
      .spyOn(sceneCommands, 'setSelectionTransform')
      .mockReturnValue({ ok: false, reason: 'no-selection' })
    const setCameraPreset = vi
      .spyOn(sceneCommands, 'setCameraPreset')
      .mockImplementation(() => undefined)

    const actions = createActions()

    expect(actions.addFurniture()).toBe(false)
    expect(
      actions.moveSelection({ x: 0.5, z: 0 }, { source: 'keyboard' }),
    ).toEqual({
      ok: false,
      reason: 'no-selection',
    })
    expect(actions.setSelectionTransform({ position: [1, 0, 0] })).toEqual({
      ok: false,
      reason: 'no-selection',
    })
    expect(actions.selectById('item-1')).toEqual({
      ok: false,
      status: 'not-found',
    })
    actions.clearSelection()
    actions.confirmDeleteSelection()
    actions.rotateSelection(1)
    actions.setCameraPreset('top')
    actions.focusSelected()
    actions.undo()
    actions.redo()

    expect(setEditorMessage).not.toHaveBeenCalled()
    expect(clearEditorMessage).not.toHaveBeenCalled()
    expect(addFurniture).not.toHaveBeenCalled()
    expect(deleteSelection).not.toHaveBeenCalled()
    expect(focusSelected).not.toHaveBeenCalled()
    expect(moveSelection).not.toHaveBeenCalled()
    expect(selectById).not.toHaveBeenCalled()
    expect(setCameraPreset).not.toHaveBeenCalled()
    expect(setSelectionTransform).not.toHaveBeenCalled()
    expect(rotateSelection).not.toHaveBeenCalled()
    expect(undo).not.toHaveBeenCalled()
    expect(redo).not.toHaveBeenCalled()
  })

  it('forwards move and selection commands when scene is available', () => {
    mockSceneReady(true)
    const clearSelection = vi
      .spyOn(sceneCommands, 'clearSelection')
      .mockImplementation(() => undefined)
    const moveSelection = vi
      .spyOn(sceneCommands, 'moveSelection')
      .mockReturnValue({
        ok: true,
        position: [1, 0, 0] as [number, number, number],
      })
    const focusSelected = vi
      .spyOn(sceneCommands, 'focusSelected')
      .mockImplementation(() => undefined)
    const undo = vi.spyOn(sceneCommands, 'undo').mockReturnValue(true)
    const redo = vi.spyOn(sceneCommands, 'redo').mockReturnValue(false)
    const rotateSelection = vi
      .spyOn(sceneCommands, 'rotateSelection')
      .mockImplementation(() => undefined)
    const selectById = vi
      .spyOn(sceneCommands, 'selectById')
      .mockReturnValue({ ok: true, status: 'selected' })
    const setSelectionTransform = vi
      .spyOn(sceneCommands, 'setSelectionTransform')
      .mockReturnValue({
        ok: true,
        item: {
          ...createFurnitureItem('item-1'),
          position: [1.5, 0, 0],
        },
      })
    const setCameraPreset = vi
      .spyOn(sceneCommands, 'setCameraPreset')
      .mockImplementation(() => undefined)

    const actions = createActions()

    expect(
      actions.moveSelection({ x: 0.5, z: 0 }, { source: 'keyboard' }),
    ).toEqual({
      ok: true,
      position: [1, 0, 0],
    })
    expect(actions.selectById('item-1')).toEqual({
      ok: true,
      status: 'selected',
    })
    expect(actions.undo()).toBe(true)
    expect(actions.redo()).toBe(false)
    actions.rotateSelection(1)
    actions.setCameraPreset('top')
    actions.focusSelected()
    expect(actions.setSelectionTransform({ position: [1.5, 0, 0] })).toEqual({
      ok: true,
      item: {
        ...createFurnitureItem('item-1'),
        position: [1.5, 0, 0],
      },
    })
    actions.clearSelection()

    expect(moveSelection).toHaveBeenCalledWith(
      { x: 0.5, z: 0 },
      { source: 'keyboard' },
    )
    expect(clearSelection).toHaveBeenCalledTimes(1)
    expect(focusSelected).toHaveBeenCalledTimes(1)
    expect(rotateSelection).toHaveBeenCalledWith(Math.PI / 12)
    expect(selectById).toHaveBeenCalledWith('item-1')
    expect(setCameraPreset).toHaveBeenCalledWith('top')
    expect(undo).toHaveBeenCalledTimes(1)
    expect(redo).toHaveBeenCalledTimes(1)
    expect(setSelectionTransform).toHaveBeenCalledWith({
      position: [1.5, 0, 0],
    })
  })
})
