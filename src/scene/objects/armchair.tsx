import { useGLTF } from '@react-three/drei'
import { useState } from 'react'
import { getClonedNode } from '@/lib/three/get-cloned-node'

export function Armchair() {
  const { scene } = useGLTF('/models/leather-collection.glb')
  const [armchair] = useState(() => getClonedNode(scene, 'armchair'))
  return <primitive object={armchair} />
}
