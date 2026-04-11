import { getClonedNode } from '@/lib/three/get-cloned-node'
import { useGLTF } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import { useState } from 'react'
import type { Object3D } from 'three'

export function Couch({ onSelect }: { onSelect?: (obj: Object3D) => void }) {
  const { scene } = useGLTF('/models/leather-collection.glb')
  const [couch] = useState(() => getClonedNode(scene, 'couch'))
  return (
    <primitive
      object={couch}
      onPointerDown={(event: ThreeEvent<PointerEvent>) => {
        event.stopPropagation()
        onSelect?.(couch)
      }}
    />
  )
}
