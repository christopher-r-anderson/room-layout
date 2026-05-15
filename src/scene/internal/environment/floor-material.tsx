import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { FloorTextures } from '@/lib/three/load-floor-texture'
import type { FloorFinishOption } from '@/lib/three/environment-materials'
import { getFloorTextureRepeat } from '@/lib/three/floor-texture-repeat'
import { loadFloorTexture } from '@/lib/three/load-floor-texture'

const FLOOR_TEXTURE_RETRY_DELAY_MS = 500
const FLOOR_TEXTURE_MAX_RETRIES = 2

interface FloorMaterialProps {
  option: FloorFinishOption | null
  roomSizeMeters: {
    width: number
    depth: number
  }
  onLoadingChange?: (isLoading: boolean) => void
}

export function FloorMaterial({
  option,
  roomSizeMeters,
  onLoadingChange,
}: FloorMaterialProps) {
  const renderer = useThree((state) => state.gl)
  const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const retryAttemptCountsRef = useRef(new Map<string, number>())
  const [retryNonce, setRetryNonce] = useState(0)
  const [texturesByOption, setTexturesByOption] = useState<{
    optionId: string
    textures: FloorTextures
    tileSizeMeters: {
      width: number
      depth: number
    }
  } | null>(null)

  useEffect(() => {
    return () => {
      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (!option) {
      onLoadingChange?.(false)
      return
    }

    let cancelled = false

    // Only report loading if we don't already have textures for this option cached
    const isAlreadyLoaded = texturesByOption?.optionId === option.id
    if (isAlreadyLoaded) {
      onLoadingChange?.(false)
      return
    }

    onLoadingChange?.(true)

    void loadFloorTexture(option, renderer)
      .then((tex) => {
        if (cancelled) {
          return
        }

        retryAttemptCountsRef.current.delete(option.id)

        setTexturesByOption({
          optionId: option.id,
          textures: tex,
          tileSizeMeters: option.tileSizeMeters,
        })
        onLoadingChange?.(false)
      })
      .catch(() => {
        if (!cancelled) {
          onLoadingChange?.(false)

          const retryAttemptCount =
            (retryAttemptCountsRef.current.get(option.id) ?? 0) + 1
          if (retryAttemptCount > FLOOR_TEXTURE_MAX_RETRIES) {
            return
          }

          retryAttemptCountsRef.current.set(option.id, retryAttemptCount)
          retryTimeoutRef.current = setTimeout(() => {
            setRetryNonce((value) => value + 1)
          }, FLOOR_TEXTURE_RETRY_DELAY_MS)
        }
      })

    return () => {
      cancelled = true

      if (retryTimeoutRef.current !== null) {
        clearTimeout(retryTimeoutRef.current)
        retryTimeoutRef.current = null
      }
    }
  }, [
    option,
    onLoadingChange,
    renderer,
    retryNonce,
    texturesByOption?.optionId,
  ])

  // Use previously loaded textures if any exist, even while new ones are loading.
  // This maintains visual continuity during transitions.
  if (!option || !texturesByOption) {
    return <meshStandardMaterial color="#e5e5e5" roughness={0.75} />
  }

  const { diffuse, normal } = texturesByOption.textures
  const displayTileSize = texturesByOption.tileSizeMeters
  const textureRepeat = getFloorTextureRepeat({
    roomWidthMeters: roomSizeMeters.width,
    roomDepthMeters: roomSizeMeters.depth,
    tileWidthMeters: displayTileSize.width,
    tileDepthMeters: displayTileSize.depth,
  })

  diffuse.repeat.set(textureRepeat.x, textureRepeat.y)
  normal.repeat.set(textureRepeat.x, textureRepeat.y)

  return (
    <meshStandardMaterial
      // Keep this keyed by the currently displayed texture set.
      // R3F/Three can keep stale shader defines when a standard material is first
      // created without maps and then receives maps later, which shows up as a
      // black floor regression. Remounting only when displayed textures change
      // preserves visual continuity during loading and forces a clean material init.
      key={texturesByOption.optionId}
      map={diffuse}
      normalMap={normal}
      roughness={0.75}
      metalness={0}
    />
  )
}
