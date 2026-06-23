import {
  NoColorSpace,
  RepeatWrapping,
  SRGBColorSpace,
  TextureLoader,
  type WebGLRenderer,
  type Texture,
} from 'three'
import { KTX2Loader } from 'three/addons/loaders/KTX2Loader.js'
import type { FloorFinishOption } from '@/shared/lib/three/environment-materials'

export interface FloorTextures {
  diffuse: Texture
  normal: Texture
}

function getBasisTranscoderPath(): string {
  const baseUrl = import.meta.env.BASE_URL
  return `${baseUrl}basis/`
}

const textureCache = new Map<string, Promise<FloorTextures>>()
const textureLoader = new TextureLoader()
const ktx2Loader = new KTX2Loader()
  .setTranscoderPath(getBasisTranscoderPath())
  .setWorkerLimit(2)
const ktx2SupportDetectedForRenderer = new WeakSet<WebGLRenderer>()

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
    if (!ktx2SupportDetectedForRenderer.has(renderer)) {
      ktx2Loader.detectSupport(renderer)
      ktx2SupportDetectedForRenderer.add(renderer)
    }

    const [diffuse, normal] = await Promise.all([
      loadTexture(option.diffusePath),
      loadTexture(option.normalPath),
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

function loadTexture(path: string): Promise<Texture> {
  if (path.toLowerCase().endsWith('.ktx2')) {
    return ktx2Loader.loadAsync(path)
  }

  return new Promise<Texture>((resolve, reject) => {
    textureLoader.load(path, resolve, undefined, reject)
  })
}
