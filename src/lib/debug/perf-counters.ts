export interface PerfCounterSnapshot {
  toolbarEmissions: number
  toolbarSinkWrites: number
  toolbarSinkNoOps: number
  lastResetAt: number
}

let toolbarEmissions = 0
let toolbarSinkWrites = 0
let toolbarSinkNoOps = 0
let lastResetAt = 0

export const perfCounters = {
  incrToolbarEmission() {
    toolbarEmissions += 1
  },
  incrToolbarSinkWrite() {
    toolbarSinkWrites += 1
  },
  incrToolbarSinkNoOp() {
    toolbarSinkNoOps += 1
  },
  read(): PerfCounterSnapshot {
    return {
      toolbarEmissions,
      toolbarSinkWrites,
      toolbarSinkNoOps,
      lastResetAt,
    }
  },
  reset() {
    toolbarEmissions = 0
    toolbarSinkWrites = 0
    toolbarSinkNoOps = 0
    lastResetAt = Date.now()
  },
}
