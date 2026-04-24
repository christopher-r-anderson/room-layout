// @vitest-environment jsdom
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { act } from 'react'
import { Mesh, BoxGeometry, MeshStandardMaterial, Object3D } from 'three'

const { mockGetClonedNode } = vi.hoisted(() => ({
  mockGetClonedNode: vi.fn(),
}))

vi.mock('@/lib/three/get-cloned-node', () => ({
  getClonedNode: mockGetClonedNode,
}))

import { createR3FTestScene } from '@/test/r3f-renderer'
import { firePointerEvent } from '@/test/pointer-helpers'
import { InteractiveFurniture } from './interactive-furniture'

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
    selected: false,
    nodeName: 'test-node',
    onObjectReady: vi.fn(),
    onSelect: vi.fn(),
    onMoveStart: vi.fn(),
    onMove: vi.fn(),
    onMoveEnd: vi.fn(),
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
      let renderer: Awaited<ReturnType<typeof createR3FTestScene>>

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
  })
})
