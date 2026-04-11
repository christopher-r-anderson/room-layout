import { Room } from './environment/room'
import { Lighting } from './environment/lighting'
import { CameraControls } from './camera/camera-controls'
import { Couch } from './objects/couch'
import { Armchair } from './objects/armchair'
import { useImperativeHandle, useState } from 'react'
import type { Object3D } from 'three'
import { EffectComposer, Outline } from '@react-three/postprocessing'
import { getMeshes } from '@/lib/three/get-meshes'

export function Scene({
  ref,
}: {
  ref: React.Ref<{ clearSelection: () => void }>
}) {
  const [selected, setSelected] = useState<Object3D | null>(null)

  useImperativeHandle(ref, () => ({
    clearSelection: () => {
      setSelected(null)
    },
  }))

  return (
    <>
      <EffectComposer autoClear={false}>
        {/* Note: do not use `Selection` is is broken in react 19: https://github.com/pmndrs/react-postprocessing/issues/330 */}
        <Outline
          selection={selected ? getMeshes(selected) : []}
          visibleEdgeColor={0xffffff}
          hiddenEdgeColor={0xffffff}
          edgeStrength={3}
        />
      </EffectComposer>
      <CameraControls />
      <Lighting />
      <Room />
      <Couch onSelect={setSelected} />
      <Armchair onSelect={setSelected} />
    </>
  )
}
