import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/domain/environment-materials'
import type { RoomSize } from '@/domain/geometry/room-metrics'
import { FloorMaterial } from './floor-material'
import { WallMaterial } from './wall-material'

interface RoomProps {
  size: RoomSize
  receiveShadows?: boolean
  floorOption?: FloorFinishOption | null
  wallOption?: WallFinishOption | null
  onFloorLoadingChange?: (isLoading: boolean) => void
}

export function Room({
  size,
  receiveShadows = true,
  floorOption = null,
  wallOption = null,
  onFloorLoadingChange,
}: RoomProps) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={receiveShadows}>
        <planeGeometry args={[size.width, size.depth]} />
        <FloorMaterial
          option={floorOption}
          roomSizeMeters={{ width: size.width, depth: size.depth }}
          onLoadingChange={onFloorLoadingChange}
        />
      </mesh>

      <mesh
        position={[0, size.height / 2, -size.depth / 2]}
        receiveShadow={receiveShadows}
      >
        <planeGeometry args={[size.width, size.height]} />
        <WallMaterial option={wallOption} />
      </mesh>

      <mesh
        position={[-size.width / 2, size.height / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow={receiveShadows}
      >
        <planeGeometry args={[size.depth, size.height]} />
        <WallMaterial option={wallOption} />
      </mesh>
    </>
  )
}
