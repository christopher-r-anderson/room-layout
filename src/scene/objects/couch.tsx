import { useGLTF } from '@react-three/drei'
import { Box3, Group, Vector3 } from 'three'
import { useMemo } from 'react'

const COUCH_TRANSFORM_NODES = [
  'Cube',
  'Cube001',
  'Cube002',
  'Cube003',
  'Cube004',
  'Cube009',
  'Cube010',
] as const

const TARGET_WIDTH = 2.2

export function Couch() {
  const { scene } = useGLTF('/models/leather-couch.glb')
  const group = useMemo(() => {
    const g = new Group()
    COUCH_TRANSFORM_NODES.forEach((name) => {
      const current = scene.getObjectByName(name)
      if (!current) {
        throw new Error('Missing leather couch node: ' + name)
      }
      g.add(current.clone(true))
    })
    return g
  }, [scene])
  const { scale, yOffset } = useMemo(() => {
    const box = new Box3().setFromObject(group)
    const center = box.getCenter(new Vector3())
    center.y = 0

    group.children.forEach((child) => {
      child.position.sub(center)
    })

    const centeredBox = new Box3().setFromObject(group)
    const size = centeredBox.getSize(new Vector3())

    const scale = TARGET_WIDTH / size.x
    const yOffset = -centeredBox.min.y * scale

    return { scale, yOffset }
  }, [group])
  return <primitive object={group} position={[0, yOffset, 0]} scale={scale} />
}
