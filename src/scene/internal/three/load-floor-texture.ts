import {
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type WebGLRenderer,
  type Texture,
} from 'three'
import type { FloorFinishOption } from '@/domain/environment-materials'
import { getKtx2Loader } from './ktx2-loader'

export interface FloorTextures {
  diffuse: Texture
  normal: Texture
}

const textureCache = new Map<string, Promise<FloorTextures>>()
const textureLoader = new TextureLoader()

function getTextureCacheKey(option: FloorFinishOption): string {
  const { id, diffusePath, normalPath } = option
  return `${id}:${diffusePath}:${normalPath}`
}

export async function loadFloorTexture(
  option: FloorFinishOption,
  renderer: WebGLRenderer,
): Promise<FloorTextures> {
  const cacheKey = getTextureCacheKey(option)

  // Return cached promise if already loading or loaded
  const cached = textureCache.get(cacheKey)
  if (cached) {
    return cached
  }

  const loadPromise = (async () => {
    const [diffuse, normal] = await Promise.all([
      loadTexture(option.diffusePath, renderer),
      loadTexture(option.normalPath, renderer),
    ])

    // Configure diffuse as sRGB color data.
    diffuse.colorSpace = SRGBColorSpace
    diffuse.wrapS = RepeatWrapping
    diffuse.wrapT = RepeatWrapping
    diffuse.needsUpdate = true

    // Configure normal as non-color data.
    normal.colorSpace = NoColorSpace
    normal.wrapS = RepeatWrapping
    normal.wrapT = RepeatWrapping
    normal.needsUpdate = true

    return { diffuse, normal }
  })()

  const retryablePromise = loadPromise.catch((error: unknown) => {
    textureCache.delete(cacheKey)
    throw error
  })

  textureCache.set(cacheKey, retryablePromise)
  return retryablePromise
}

function loadTexture(path: string, renderer: WebGLRenderer): Promise<Texture> {
  if (path.toLowerCase().endsWith('.ktx2')) {
    return getKtx2Loader(renderer).loadAsync(path)
  }

  return new Promise<Texture>((resolve, reject) => {
    textureLoader.load(path, resolve, undefined, reject)
  })
}
