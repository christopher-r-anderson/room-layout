import {
  BoxGeometry,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PerspectiveCamera,
} from 'three'
import { describe, expect, it } from 'vitest'
import { createSceneSnapshot } from './scene-snapshot'
import type { FurnitureItem } from '../objects/furniture.types'

const CANVAS_SIZE = {
  width: 800,
  height: 600,
}

function createFurnitureItem(
  id: string,
  overrides?: Partial<FurnitureItem>,
): FurnitureItem {
  return {
    id,
    catalogId: 'catalog-couch',
    name: 'Catalog Couch',
    kind: 'couch',
    collectionId: 'collection-couch',
    nodeName: 'couch-node',
    sourcePath: '/models/source.glb',
    footprintSize: {
      width: 2,
      depth: 1,
    },
    position: [0, 0, 0],
    rotationY: 0,
    ...overrides,
  }
}

function createDefaultCamera() {
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

describe('createSceneSnapshot', () => {
  it('returns snapshot structure with selected metadata and items', () => {
    const item = createFurnitureItem('item-1')
    const snapshot = createSceneSnapshot(
      [item],
      'item-1',
      new Map(),
      createDefaultCamera(),
      CANVAS_SIZE,
    )

    expect(snapshot).toEqual({
      selectedId: 'item-1',
      selectedName: 'Catalog Couch',
      itemCount: 1,
      items: [
        {
          id: 'item-1',
          catalogId: 'catalog-couch',
          name: 'Catalog Couch',
          position: [0, 0, 0],
          rotationY: 0,
          pointerTarget: null,
        },
      ],
    })
  })

  it('returns selectedName null when selectedId is null', () => {
    const snapshot = createSceneSnapshot(
      [createFurnitureItem('item-1')],
      null,
      new Map(),
      createDefaultCamera(),
      CANVAS_SIZE,
    )

    expect(snapshot.selectedName).toBeNull()
  })

  it('returns selectedName null when selected id is not found', () => {
    const snapshot = createSceneSnapshot(
      [createFurnitureItem('item-1')],
      'missing-id',
      new Map(),
      createDefaultCamera(),
      CANVAS_SIZE,
    )

    expect(snapshot.selectedName).toBeNull()
  })

  it('returns selectedName when selected id matches an item', () => {
    const snapshot = createSceneSnapshot(
      [createFurnitureItem('item-1', { name: 'End Table' })],
      'item-1',
      new Map(),
      createDefaultCamera(),
      CANVAS_SIZE,
    )

    expect(snapshot.selectedName).toBe('End Table')
  })

  it('rounds position coordinates to 3 decimal places', () => {
    const snapshot = createSceneSnapshot(
      [createFurnitureItem('item-1', { position: [1.23456, 0, 7.89012] })],
      null,
      new Map(),
      createDefaultCamera(),
      CANVAS_SIZE,
    )

    expect(snapshot.items[0]?.position).toEqual([1.235, 0, 7.89])
  })

  it('rounds rotationY to 6 decimal places', () => {
    const snapshot = createSceneSnapshot(
      [createFurnitureItem('item-1', { rotationY: 1.12345678 })],
      null,
      new Map(),
      createDefaultCamera(),
      CANVAS_SIZE,
    )

    expect(snapshot.items[0]?.rotationY).toBe(1.123457)
  })

  it('returns null pointerTarget when object ref is not registered', () => {
    const snapshot = createSceneSnapshot(
      [createFurnitureItem('item-1')],
      null,
      new Map(),
      createDefaultCamera(),
      CANVAS_SIZE,
    )

    expect(snapshot.items[0]?.pointerTarget).toBeNull()
  })

  it('returns null pointerTarget when projected values are non-finite', () => {
    const camera = createDefaultCamera()
    camera.projectionMatrix.set(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)

    const object = new Object3D()
    object.position.set(0, 0, -2)

    const snapshot = createSceneSnapshot(
      [createFurnitureItem('item-1')],
      null,
      new Map([['item-1', object]]),
      camera,
      CANVAS_SIZE,
    )

    expect(snapshot.items[0]?.pointerTarget).toBeNull()
  })

  it('returns centered pointerTarget for a mesh in front of camera', () => {
    const camera = createDefaultCamera()
    const mesh = new Mesh(new BoxGeometry(1, 1, 1), new MeshBasicMaterial())
    mesh.position.set(0, 0, -2)

    const snapshot = createSceneSnapshot(
      [createFurnitureItem('item-1')],
      null,
      new Map([['item-1', mesh]]),
      camera,
      CANVAS_SIZE,
    )

    expect(snapshot.items[0]?.pointerTarget?.x).toBeCloseTo(
      CANVAS_SIZE.width / 2,
    )
    expect(snapshot.items[0]?.pointerTarget?.y).toBeCloseTo(
      CANVAS_SIZE.height / 2,
    )
  })

  it('falls back to matrix position when object bounds are empty', () => {
    const camera = createDefaultCamera()
    const object = new Object3D()
    object.position.set(0, 0, -3)

    const snapshot = createSceneSnapshot(
      [createFurnitureItem('item-1')],
      null,
      new Map([['item-1', object]]),
      camera,
      CANVAS_SIZE,
    )

    expect(snapshot.items[0]?.pointerTarget).not.toBeNull()
    expect(snapshot.items[0]?.pointerTarget?.x).toBeCloseTo(
      CANVAS_SIZE.width / 2,
    )
    expect(snapshot.items[0]?.pointerTarget?.y).toBeCloseTo(
      CANVAS_SIZE.height / 2,
    )
  })
})
