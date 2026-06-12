import type { WallFinishOption } from '@/shared/lib/three/environment-materials'

interface WallMaterialProps {
  option: WallFinishOption | null
}

export function WallMaterial({ option }: WallMaterialProps) {
  if (!option) {
    return <meshStandardMaterial color={0xf5f5f5} />
  }

  return <meshStandardMaterial color={option.color} />
}
