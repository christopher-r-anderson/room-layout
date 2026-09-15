// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { act } from 'react'
import { Group, Mesh, BoxGeometry, MeshStandardMaterial, Object3D } from 'three'

const { mockGetClonedNode } = vi.hoisted(() => ({
  mockGetClonedNode: vi.fn(),
}))

vi.mock('@/scene/internal/three/get-cloned-node', () => ({
  getClonedNode: mockGetClonedNode,
}))

import { createR3FTestScene } from '@/test/support/r3f-renderer'
import { firePointerEvent } from '@/test/support/pointer-helpers'
import { InteractiveFurniture } from './interactive-furniture'
import { getMeshes } from '@/scene/internal/three/get-meshes'
import { isUiBoundsObject } from '@/scene/internal/three/ui-bounds'

beforeEach(() => {
  mockGetClonedNode.mockReturnValue(
    new Mesh(new BoxGeometry(), new MeshStandardMaterial()),
  )
})

function defaultProps(
  overrides: Partial<Parameters<typeof InteractiveFurniture>[0]> = {},
) {
  return {
    id: 'chair-1',
    position: [0, 0, 0] as [number, number, number],
    rotationY: 0,
    sourceScene: new Object3D(),
    nodeName: 'test-node',
    uiBoundsNodeName: undefined,
    selected: false,
    isDragging: false,
    onObjectReady: vi.fn(),
    onSelect: vi.fn(),
    onMoveStart: vi.fn(),
    onMove: vi.fn(),
    onMoveEnd: vi.fn(),
    onPreviewStart: vi.fn(),
    onPreviewEnd: vi.fn(),
    ...overrides,
  }
}

describe('InteractiveFurniture', () => {
  describe('scene graph structure', () => {
    it('renders a group at scene.children[0]', async () => {
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...defaultProps()} />,
      )
      expect(renderer.scene.children[0].type).toBe('Group')
    })

    it('renders with correct position', async () => {
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...defaultProps({ position: [1, 0, 2] })} />,
      )
      const group = renderer.scene.children[0].instance
      expect(group.position.toArray()).toEqual([1, 0, 2])
    })

    it('renders with correct rotation', async () => {
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...defaultProps({ rotationY: Math.PI / 2 })} />,
      )
      const group = renderer.scene.children[0].instance
      expect(group.rotation.y).toBeCloseTo(Math.PI / 2)
    })

    it('positions cloned model child at origin', async () => {
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...defaultProps()} />,
      )
      const group = renderer.scene.children[0].instance
      const primitive = group.children[0]
      expect(primitive.position.toArray()).toEqual([0, 0, 0])
    })

    it('re-renders with updated position', async () => {
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...defaultProps()} />,
      )
      await renderer.update(
        <InteractiveFurniture {...defaultProps({ position: [3, 0, 4] })} />,
      )
      const group = renderer.scene.children[0].instance
      expect(group.position.toArray()).toEqual([3, 0, 4])
    })

    it('marks and excludes ui-bounds meshes before default mesh collection', async () => {
      const visualMesh = new Mesh(new BoxGeometry(), new MeshStandardMaterial())
      const uiBoundsMesh = new Mesh(
        new BoxGeometry(),
        new MeshStandardMaterial(),
      )
      uiBoundsMesh.name = 'Chair_UIBounds'
      const model = new Group()
      model.add(visualMesh, uiBoundsMesh)
      mockGetClonedNode.mockReturnValueOnce(model)

      const renderer = await createR3FTestScene(
        <InteractiveFurniture
          {...defaultProps({ uiBoundsNodeName: 'Chair_UIBounds' })}
        />,
      )

      const group = renderer.scene.children[0].instance
      const primitive = group.children[0]
      const markedUiBounds = primitive.getObjectByName('Chair_UIBounds')

      expect(markedUiBounds).not.toBeNull()
      expect(markedUiBounds && isUiBoundsObject(markedUiBounds)).toBe(true)
      expect(markedUiBounds?.visible).toBe(false)
      expect(getMeshes(primitive)).toEqual([visualMesh])
      expect(getMeshes(primitive, { includeUiBounds: true })).toContain(
        uiBoundsMesh,
      )
      expect(uiBoundsMesh.castShadow).toBe(false)
      expect(uiBoundsMesh.receiveShadow).toBe(false)
    })

    it('throws when ui-bounds points at the cloned model root', async () => {
      const model = new Group()
      model.name = 'ChairRoot'
      mockGetClonedNode.mockReturnValue(model)

      await expect(
        createR3FTestScene(
          <InteractiveFurniture
            {...defaultProps({
              nodeName: 'ChairRoot',
              uiBoundsNodeName: 'ChairRoot',
            })}
          />,
        ),
      ).rejects.toThrow(
        'ChairRoot ui bounds node must be a descendant of cloned ChairRoot',
      )
    })
  })

  describe('onObjectReady lifecycle', () => {
    it('calls onObjectReady with id and group ref on mount', async () => {
      const onObjectReady = vi.fn()

      await act(async () => {
        await createR3FTestScene(
          <InteractiveFurniture {...defaultProps({ onObjectReady })} />,
        )
      })

      expect(onObjectReady).toHaveBeenCalledTimes(1)
      expect(onObjectReady).toHaveBeenCalledWith('chair-1', expect.any(Object))
      expect(onObjectReady.mock.calls[0][1]).not.toBeNull()
    })

    it('calls onObjectReady with null on unmount', async () => {
      const onObjectReady = vi.fn()
      let renderer!: Awaited<ReturnType<typeof createR3FTestScene>>

      await act(async () => {
        renderer = await createR3FTestScene(
          <InteractiveFurniture {...defaultProps({ onObjectReady })} />,
        )
      })

      onObjectReady.mockClear()

      await act(async () => {
        await renderer.unmount()
      })

      expect(onObjectReady).toHaveBeenCalledTimes(1)
      expect(onObjectReady).toHaveBeenCalledWith('chair-1', null)
    })
  })

  describe('event handler invocation', () => {
    it('calls onSelect and onMoveStart on pointerDown', async () => {
      const props = defaultProps()
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...props} />,
      )
      const group = renderer.scene.children[0]

      await firePointerEvent(renderer, group, 'pointerDown', { pointerId: 1 })

      expect(props.onSelect).toHaveBeenCalledWith('chair-1')
      expect(props.onMoveStart).toHaveBeenCalledWith(
        'chair-1',
        expect.any(Object),
      )
    })

    it('calls onMove on pointerMove when selected', async () => {
      const props = defaultProps({ selected: true })
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...props} />,
      )
      const group = renderer.scene.children[0]

      await firePointerEvent(renderer, group, 'pointerMove', {
        pointerId: 1,
        buttons: 1,
      })

      expect(props.onMove).toHaveBeenCalledWith('chair-1', expect.any(Object))
    })

    it('does not call onMove on pointerMove when not selected', async () => {
      const props = defaultProps({ selected: false })
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...props} />,
      )
      const group = renderer.scene.children[0]

      await firePointerEvent(renderer, group, 'pointerMove', {
        pointerId: 1,
        buttons: 1,
      })

      expect(props.onMove).not.toHaveBeenCalled()
    })

    it('calls onMoveEnd on pointerUp', async () => {
      const props = defaultProps()
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...props} />,
      )
      const group = renderer.scene.children[0]

      await firePointerEvent(renderer, group, 'pointerUp', { pointerId: 1 })

      expect(props.onMoveEnd).toHaveBeenCalledWith(
        'chair-1',
        expect.any(Object),
      )
    })

    it('calls onMoveEnd on pointerCancel', async () => {
      const props = defaultProps()
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...props} />,
      )
      const group = renderer.scene.children[0]

      await firePointerEvent(renderer, group, 'pointerCancel', { pointerId: 1 })

      expect(props.onMoveEnd).toHaveBeenCalledWith(
        'chair-1',
        expect.any(Object),
      )
    })

    it('calls onPreviewStart on pointer enter when not dragging', async () => {
      const props = defaultProps({ isDragging: false })
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...props} />,
      )
      const group = renderer.scene.children[0]

      await firePointerEvent(renderer, group, 'pointerEnter', {})

      expect(props.onPreviewStart).toHaveBeenCalledWith('chair-1')
    })

    it('does not call onPreviewStart on pointer enter when dragging', async () => {
      const props = defaultProps({ isDragging: true })
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...props} />,
      )
      const group = renderer.scene.children[0]

      await firePointerEvent(renderer, group, 'pointerEnter', {})

      expect(props.onPreviewStart).not.toHaveBeenCalled()
    })

    it('calls onPreviewEnd on pointer leave', async () => {
      const props = defaultProps()
      const renderer = await createR3FTestScene(
        <InteractiveFurniture {...props} />,
      )
      const group = renderer.scene.children[0]

      await firePointerEvent(renderer, group, 'pointerLeave', {})

      expect(props.onPreviewEnd).toHaveBeenCalled()
    })
  })
})
