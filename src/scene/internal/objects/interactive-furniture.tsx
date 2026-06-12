import { getClonedNode } from '@/shared/lib/three/get-cloned-node'
import { getMeshes } from '@/shared/lib/three/get-meshes'
import { markUiBoundsSubtree } from '@/shared/lib/three/ui-bounds'
import type { ThreeEvent } from '@react-three/fiber'
import { useEffect, useRef, useState } from 'react'
import type { Group, Object3D } from 'three'
import type { InteractiveFurnitureProps } from '../../objects/furniture.types'

interface PointerCaptureTarget extends EventTarget {
  setPointerCapture: (pointerId: number) => void
  releasePointerCapture: (pointerId: number) => void
  hasPointerCapture?: (pointerId: number) => boolean
}

function getPointerCaptureTarget(event: ThreeEvent<PointerEvent>) {
  const { target } = event

  if (
    target &&
    'setPointerCapture' in target &&
    'releasePointerCapture' in target
  ) {
    return target as PointerCaptureTarget
  }

  return null
}

function releasePointerCapture(event: ThreeEvent<PointerEvent>) {
  const target = getPointerCaptureTarget(event)

  if (target?.hasPointerCapture?.(event.pointerId)) {
    target.releasePointerCapture(event.pointerId)
  }
}

export function InteractiveFurniture({
  id,
  position,
  rotationY,
  sourceScene,
  selected,
  isDragging,
  onObjectReady,
  onSelect,
  onMoveStart,
  onMove,
  onMoveEnd,
  onPreviewStart,
  onPreviewEnd,
  nodeName,
  uiBoundsNodeName,
  enableShadows = true,
}: InteractiveFurnitureProps & { enableShadows?: boolean }) {
  const groupRef = useRef<Group>(null)
  const [model] = useState<Object3D>(() => {
    // Model/shadow flags are intentionally derived once at mount. The quality mode
    // is configured at app startup and not expected to toggle during a running session.
    const node = getClonedNode(sourceScene, nodeName)
    node.position.set(0, 0, 0)

    if (uiBoundsNodeName) {
      const uiBoundsNode = node.getObjectByName(uiBoundsNodeName)

      if (!uiBoundsNode) {
        throw new Error(
          `${uiBoundsNodeName} ui bounds node not found under cloned ${nodeName}`,
        )
      }

      if (uiBoundsNode === node) {
        throw new Error(
          `${uiBoundsNodeName} ui bounds node must be a descendant of cloned ${nodeName}`,
        )
      }

      markUiBoundsSubtree(uiBoundsNode)
    }

    for (const mesh of getMeshes(node)) {
      mesh.castShadow = enableShadows
      mesh.receiveShadow = enableShadows
    }
    return node
  })

  useEffect(() => {
    onObjectReady(id, groupRef.current)

    return () => {
      onObjectReady(id, null)
    }
  }, [id, onObjectReady])

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={[0, rotationY, 0]}
      onPointerDown={(event) => {
        event.stopPropagation()
        getPointerCaptureTarget(event)?.setPointerCapture(event.pointerId)
        onSelect(id)
        onMoveStart(id, event)
      }}
      onPointerMove={(event) => {
        if (!selected) {
          return
        }

        event.stopPropagation()
        onMove(id, event)
      }}
      onPointerUp={(event) => {
        releasePointerCapture(event)
        onMoveEnd(id, event)
      }}
      onPointerCancel={(event) => {
        releasePointerCapture(event)
        onMoveEnd(id, event)
      }}
      onPointerEnter={(event) => {
        if (isDragging) {
          return
        }
        event.stopPropagation()
        onPreviewStart(id)
      }}
      onPointerLeave={() => {
        onPreviewEnd()
      }}
    >
      <primitive object={model} />
    </group>
  )
}
