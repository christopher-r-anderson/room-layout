import { describe, expect, it } from 'vitest'
import {
  BoxGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
} from 'three'
import { computeSelectedToolbarGeometry } from './selected-toolbar-geometry'
import { markUiBoundsSubtree } from '@/lib/three/ui-bounds'

const CANVAS_SIZE = { width: 800, height: 600 }

function createCamera() {
  const camera = new PerspectiveCamera(
    60,
    CANVAS_SIZE.width / CANVAS_SIZE.height,
    0.1,
    100,
  )
  camera.position.set(0, 0, 0)
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld(true)
  return camera
}

describe('computeSelectedToolbarGeometry', () => {
  it('returns unavailable when there is no selection', () => {
    expect(
      computeSelectedToolbarGeometry({
        selectedId: null,
        object: null,
        camera: createCamera(),
        canvasSize: CANVAS_SIZE,
      }),
    ).toEqual({
      kind: 'unavailable',
      selectedId: null,
      reason: 'no-selection',
    })
  })

  it('prefers ui-bounds points when they exist', () => {
    const object = new Group()
    const visualMesh = new Mesh(
      new BoxGeometry(1, 1, 1),
      new MeshBasicMaterial(),
    )
    visualMesh.position.set(0, 0, -2)
    const uiBoundsMesh = new Mesh(
      new BoxGeometry(2, 2, 2),
      new MeshBasicMaterial(),
    )
    uiBoundsMesh.name = 'Chair_UIBounds'
    uiBoundsMesh.position.set(0.5, 0, -2)
    markUiBoundsSubtree(uiBoundsMesh)
    object.add(visualMesh, uiBoundsMesh)

    const result = computeSelectedToolbarGeometry({
      selectedId: 'item-1',
      object,
      camera: createCamera(),
      canvasSize: CANVAS_SIZE,
    })

    expect(result.kind).toBe('available')
    if (result.kind !== 'available') {
      return
    }
    expect(result.source).toBe('ui-bounds-node')
    expect(result.sourceNodeName).toBe('Chair_UIBounds')
    expect(result.points.length).toBeGreaterThan(0)
    expect(result.sourcePointCount).toBe(24)
    expect(result.projectedPointCount).toBe(result.points.length)
  })

  it('falls back to render bounds when ui-bounds are absent', () => {
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    mesh.position.set(0, 0, -2)

    const result = computeSelectedToolbarGeometry({
      selectedId: 'item-1',
      object: mesh,
      camera: createCamera(),
      canvasSize: CANVAS_SIZE,
    })

    expect(result.kind).toBe('available')
    if (result.kind !== 'available') {
      return
    }
    expect(result.source).toBe('render-bounds')
    expect(result.sourcePointCount).toBe(8)
    expect(result.projectedPointCount).toBe(8)
    expect(result.points).toHaveLength(8)
  })

  it('falls back to object origin when visual bounds are empty', () => {
    const object = new Object3D()
    object.position.set(0, 0, -3)

    const result = computeSelectedToolbarGeometry({
      selectedId: 'item-1',
      object,
      camera: createCamera(),
      canvasSize: CANVAS_SIZE,
    })

    expect(result.kind).toBe('available')
    if (result.kind !== 'available') {
      return
    }
    expect(result.source).toBe('object-origin')
    expect(result.sourcePointCount).toBe(1)
    expect(result.projectedPointCount).toBe(1)
    expect(result.points).toHaveLength(1)
  })
})
