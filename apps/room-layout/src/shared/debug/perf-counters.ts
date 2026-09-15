export interface PerfCounterSnapshot {
  toolbarEmissions: number
  toolbarEmissionsFromFrame: number
  toolbarEmissionsFromEffect: number
  toolbarSinkWrites: number
  toolbarSinkNoOps: number
  sceneRenders: number
  sceneMounts: number
  appRenders: number
  lastResetAt: number
}

let toolbarEmissions = 0
let toolbarEmissionsFromFrame = 0
let toolbarEmissionsFromEffect = 0
let toolbarSinkWrites = 0
let toolbarSinkNoOps = 0
let sceneRenders = 0
let sceneMounts = 0
let appRenders = 0
let lastResetAt = 0

export const perfCounters = {
  incrToolbarEmission() {
    toolbarEmissions += 1
  },
  incrToolbarEmissionFromFrame() {
    toolbarEmissionsFromFrame += 1
  },
  incrToolbarEmissionFromEffect() {
    toolbarEmissionsFromEffect += 1
  },
  incrToolbarSinkWrite() {
    toolbarSinkWrites += 1
  },
  incrToolbarSinkNoOp() {
    toolbarSinkNoOps += 1
  },
  incrSceneRender() {
    sceneRenders += 1
  },
  incrSceneMount() {
    sceneMounts += 1
  },
  incrAppRender() {
    appRenders += 1
  },
  read(): PerfCounterSnapshot {
    return {
      toolbarEmissions,
      toolbarEmissionsFromFrame,
      toolbarEmissionsFromEffect,
      toolbarSinkWrites,
      toolbarSinkNoOps,
      sceneRenders,
      sceneMounts,
      appRenders,
      lastResetAt,
    }
  },
  reset() {
    toolbarEmissions = 0
    toolbarEmissionsFromFrame = 0
    toolbarEmissionsFromEffect = 0
    toolbarSinkWrites = 0
    toolbarSinkNoOps = 0
    sceneRenders = 0
    sceneMounts = 0
    appRenders = 0
    lastResetAt = Date.now()
  },
}
