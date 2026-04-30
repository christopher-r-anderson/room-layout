// @vitest-environment jsdom

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { FurnitureItem } from '@/scene/objects/furniture.types'
import { SceneInspector } from './scene-inspector'

const FURNITURE_ITEM: FurnitureItem = {
  id: 'item-1',
  catalogId: 'couch-1',
  name: 'Leather Couch',
  kind: 'couch',
  collectionId: 'leather-collection',
  nodeName: 'couch',
  sourcePath: '/models/leather-collection.glb',
  footprintSize: {
    width: 2.2,
    depth: 0.95,
  },
  position: [0, 0, 0],
  rotationY: 0,
}

describe('SceneInspector', () => {
  it('shows an empty hint when no furniture is selected', () => {
    render(<SceneInspector selectedFurniture={null} />)

    expect(
      screen.getByText(/select an item from the list or canvas to inspect it/i),
    ).toBeVisible()
    expect(screen.getByText('Selected item')).toBeVisible()
  })

  it('shows name, rotation, and coordinates for selected furniture', () => {
    render(<SceneInspector selectedFurniture={FURNITURE_ITEM} />)

    expect(screen.getByText('Leather Couch')).toBeVisible()
    expect(screen.getByText('Rotation: 0 deg')).toBeVisible()
    expect(screen.getByText('X: 0.0 m')).toBeVisible()
    expect(screen.getByText('Z: 0.0 m')).toBeVisible()
  })
})
