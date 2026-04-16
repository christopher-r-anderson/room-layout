import { describe, expect, it } from 'vitest'
import {
  FURNITURE_COLLECTION_PATHS,
  resolvePublicAssetPath,
} from './furniture-catalog'

describe('resolvePublicAssetPath', () => {
  it('joins the Vite base path with public model paths', () => {
    expect(resolvePublicAssetPath('models/leather-collection.glb')).toBe(
      `${import.meta.env.BASE_URL}models/leather-collection.glb`,
    )
  })

  it('avoids double slashes for leading slash asset paths', () => {
    expect(resolvePublicAssetPath('/models/leather-collection.glb')).toBe(
      `${import.meta.env.BASE_URL}models/leather-collection.glb`,
    )
  })

  it('uses the resolved public path for collection loading', () => {
    expect(FURNITURE_COLLECTION_PATHS).toContain(
      `${import.meta.env.BASE_URL}models/leather-collection.glb`,
    )
  })
})
