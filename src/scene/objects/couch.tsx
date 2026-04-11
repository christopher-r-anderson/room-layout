import { getClonedNode } from '@/lib/three/get-cloned-node'
import { useGLTF } from '@react-three/drei'
import { useState } from 'react'

export function Couch() {
  const { scene } = useGLTF('/models/leather-collection.glb')
  const [couch] = useState(() => getClonedNode(scene, 'couch'))
  return <primitive object={couch} />
}
