import { useGLTF } from '@react-three/drei'
import { useState } from 'react'
import { getClonedNode } from '@/lib/three/get-cloned-node'
import type { Object3D } from 'three'
import type { ThreeEvent } from '@react-three/fiber'

export function Armchair({ onSelect }: { onSelect?: (obj: Object3D) => void }) {
  const { scene } = useGLTF('/models/leather-collection.glb')
  const [armchair] = useState(() => getClonedNode(scene, 'armchair'))
  return (
    <primitive
      object={armchair}
      onPointerDown={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        onSelect?.(armchair)
      }}
    />
  )
}
