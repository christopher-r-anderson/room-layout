import { Room } from './environment/room'
import { Lighting } from './environment/lighting'
import { CameraControls } from './camera/camera-controls'
import { Couch } from './objects/couch'

export function Scene() {
  return (
    <>
      <CameraControls />
      <Lighting />
      <Room />
      <Couch />
    </>
  )
}
