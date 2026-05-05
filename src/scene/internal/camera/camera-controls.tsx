import { OrbitControls } from '@react-three/drei'

export function CameraControls({ enabled = true }: { enabled?: boolean }) {
  return (
    <OrbitControls
      makeDefault
      enabled={enabled}
      enablePan={false}
      minDistance={2}
      maxDistance={12}
      maxPolarAngle={Math.PI / 2 - 0.05}
    />
  )
}
