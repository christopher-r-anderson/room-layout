import { Room } from './environment/room'
import { Lighting } from './environment/lighting'
import { CameraControls } from './camera/camera-controls'

export function Scene() {
  return (
    <>
      <CameraControls />
      <Lighting />
      <Room />
    </>
  )
}
