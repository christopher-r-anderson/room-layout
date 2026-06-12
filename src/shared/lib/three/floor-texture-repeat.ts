interface FloorTextureRepeatOptions {
  roomWidthMeters: number
  roomDepthMeters: number
  tileWidthMeters: number
  tileDepthMeters: number
}

export interface FloorTextureRepeat {
  x: number
  y: number
}

function assertPositiveFinite(value: number, name: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new RangeError(`${name} must be a positive finite number`)
  }
}

export function getFloorTextureRepeat({
  roomWidthMeters,
  roomDepthMeters,
  tileWidthMeters,
  tileDepthMeters,
}: FloorTextureRepeatOptions): FloorTextureRepeat {
  assertPositiveFinite(roomWidthMeters, 'roomWidthMeters')
  assertPositiveFinite(roomDepthMeters, 'roomDepthMeters')
  assertPositiveFinite(tileWidthMeters, 'tileWidthMeters')
  assertPositiveFinite(tileDepthMeters, 'tileDepthMeters')

  return {
    x: roomWidthMeters / tileWidthMeters,
    y: roomDepthMeters / tileDepthMeters,
  }
}
