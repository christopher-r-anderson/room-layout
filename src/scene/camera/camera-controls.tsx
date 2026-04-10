import { OrbitControls } from '@react-three/drei'

export function CameraControls() {
  return (
    <OrbitControls
      makeDefault
      enablePan={false}
      minDistance={2}
      maxDistance={12}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  )
}
