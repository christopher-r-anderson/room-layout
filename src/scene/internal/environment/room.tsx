import type {
  FloorFinishOption,
  WallFinishOption,
} from '@/shared/lib/three/environment-materials'
import { FloorMaterial } from './floor-material'
import { WallMaterial } from './wall-material'
import {
  ROOM_FLOOR_DEPTH_METERS,
  ROOM_FLOOR_WIDTH_METERS,
  ROOM_HALF_DEPTH_METERS,
  ROOM_HALF_WIDTH_METERS,
  ROOM_WALL_HEIGHT_METERS,
} from './room-constants'

interface RoomProps {
  receiveShadows?: boolean
  floorOption?: FloorFinishOption | null
  wallOption?: WallFinishOption | null
  onFloorLoadingChange?: (isLoading: boolean) => void
}

export function Room({
  receiveShadows = true,
  floorOption = null,
  wallOption = null,
  onFloorLoadingChange,
}: RoomProps) {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow={receiveShadows}>
        <planeGeometry
          args={[ROOM_FLOOR_WIDTH_METERS, ROOM_FLOOR_DEPTH_METERS]}
        />
        <FloorMaterial
          option={floorOption}
          roomSizeMeters={{
            width: ROOM_FLOOR_WIDTH_METERS,
            depth: ROOM_FLOOR_DEPTH_METERS,
          }}
          onLoadingChange={onFloorLoadingChange}
        />
      </mesh>

      <mesh
        position={[0, ROOM_WALL_HEIGHT_METERS / 2, -ROOM_HALF_DEPTH_METERS]}
        receiveShadow={receiveShadows}
      >
        <planeGeometry
          args={[ROOM_FLOOR_WIDTH_METERS, ROOM_WALL_HEIGHT_METERS]}
        />
        <WallMaterial option={wallOption} />
      </mesh>

      <mesh
        position={[-ROOM_HALF_WIDTH_METERS, ROOM_WALL_HEIGHT_METERS / 2, 0]}
        rotation={[0, Math.PI / 2, 0]}
        receiveShadow={receiveShadows}
      >
        <planeGeometry
          args={[ROOM_FLOOR_DEPTH_METERS, ROOM_WALL_HEIGHT_METERS]}
        />
        <WallMaterial option={wallOption} />
      </mesh>
    </>
  )
}
