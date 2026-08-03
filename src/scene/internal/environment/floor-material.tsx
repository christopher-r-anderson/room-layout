import { useEffect, useRef, useState } from 'react'
import { useThree } from '@react-three/fiber'
import type { FloorTextures } from '@/scene/internal/three/load-floor-texture'
import type { FloorFinishOption } from '@/domain/environment-materials'
import { getFloorTextureRepeat } from '@/scene/internal/three/floor-texture-repeat'
import { loadFloorTexture } from '@/scene/internal/three/load-floor-texture'

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

  // Previously loaded textures stay up while new ones load, for visual
  // continuity during transitions.
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
      // Three can keep stale shader defines when a material created without
      // maps receives maps later (a black-floor regression); remounting per
      // displayed texture set forces a clean material init.
      key={texturesByOption.optionId}
      map={diffuse}
      normalMap={normal}
      roughness={0.75}
      metalness={0}
    />
  )
}
