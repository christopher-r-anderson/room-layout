import { getClonedNode } from '@/lib/three/get-cloned-node'
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
  onObjectReady,
  onSelect,
  onMoveStart,
  onMove,
  onMoveEnd,
  nodeName,
}: InteractiveFurnitureProps & { nodeName: string }) {
  const groupRef = useRef<Group>(null)
  const [model] = useState<Object3D>(() => {
    const node = getClonedNode(sourceScene, nodeName)
    node.position.set(0, 0, 0)
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
    >
      <primitive object={model} />
    </group>
  )
}
