import { useCallback, useEffect, useRef, type RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Camera, Object3D } from 'three'
import { toolbarGeometryActions } from '@/core/stores/toolbar-geometry-store'
import { perfCounters } from '@/shared/debug/perf-counters'
import { IS_E2E_BUILD } from '@/shared/env/e2e'
import { computeSelectedToolbarGeometry } from './selected-toolbar-geometry'
import type { SelectedToolbarGeometry } from '@/core/scene.types'

const TOOLBAR_GEOMETRY_DEADBAND_PX = 0.5
const TOOLBAR_GEOMETRY_FRAME_INTERVAL_SECONDS = 1 / 24

function approximatelyEqualPx(left: number, right: number) {
  return Math.abs(left - right) <= TOOLBAR_GEOMETRY_DEADBAND_PX
}

function isSameToolbarGeometry(
  previousGeometry: SelectedToolbarGeometry,
  nextGeometry: SelectedToolbarGeometry,
) {
  if (
    previousGeometry.kind === 'unavailable' &&
    nextGeometry.kind === 'unavailable'
  ) {
    return (
      previousGeometry.selectedId === nextGeometry.selectedId &&
      previousGeometry.reason === nextGeometry.reason
    )
  }

  if (
    previousGeometry.kind !== 'available' ||
    nextGeometry.kind !== 'available'
  ) {
    return false
  }

  if (
    previousGeometry.selectedId !== nextGeometry.selectedId ||
    previousGeometry.source !== nextGeometry.source ||
    previousGeometry.sourceNodeName !== nextGeometry.sourceNodeName ||
    previousGeometry.sourcePointCount !== nextGeometry.sourcePointCount ||
    previousGeometry.projectedPointCount !== nextGeometry.projectedPointCount
  ) {
    return false
  }

  if (
    !approximatelyEqualPx(
      previousGeometry.canvasSize.width,
      nextGeometry.canvasSize.width,
    ) ||
    !approximatelyEqualPx(
      previousGeometry.canvasSize.height,
      nextGeometry.canvasSize.height,
    )
  ) {
    return false
  }

  if (previousGeometry.points.length !== nextGeometry.points.length) {
    return false
  }

  return previousGeometry.points.every((previousPoint, index) => {
    const nextPoint = nextGeometry.points[index]
    return (
      approximatelyEqualPx(previousPoint.x, nextPoint.x) &&
      approximatelyEqualPx(previousPoint.y, nextPoint.y)
    )
  })
}

interface UseToolbarGeometryProjectionOptions {
  selectedId: string | null
  objectRefs: RefObject<Map<string, Object3D>>
  camera: Camera
  canvasSize: { width: number; height: number }
}

/**
 * Emits on selection/camera/size change (effect) and ~24x/sec during
 * continuous camera motion (frame), de-duplicated by a pixel deadband so
 * sub-pixel jitter does not churn the toolbar placement.
 */
export function useToolbarGeometryProjection({
  selectedId,
  objectRefs,
  camera,
  canvasSize,
}: UseToolbarGeometryProjectionOptions) {
  const lastToolbarGeometryRef = useRef<SelectedToolbarGeometry | null>(null)
  const frameAccumulatorRef = useRef(0)

  const emit = useCallback(
    (source: 'effect' | 'frame') => {
      const nextGeometry = computeSelectedToolbarGeometry({
        selectedId,
        object: selectedId
          ? (objectRefs.current.get(selectedId) ?? null)
          : null,
        camera,
        canvasSize,
      })

      const previousGeometry = lastToolbarGeometryRef.current
      if (
        previousGeometry &&
        isSameToolbarGeometry(previousGeometry, nextGeometry)
      ) {
        return
      }

      lastToolbarGeometryRef.current = nextGeometry
      if (import.meta.env.DEV || IS_E2E_BUILD) {
        perfCounters.incrToolbarEmission()
        if (source === 'effect') {
          perfCounters.incrToolbarEmissionFromEffect()
        } else {
          perfCounters.incrToolbarEmissionFromFrame()
        }
      }
      toolbarGeometryActions.setToolbarGeometry(nextGeometry)
    },
    [camera, canvasSize, objectRefs, selectedId],
  )

  useEffect(() => {
    emit('effect')
  }, [emit])

  useFrame((_, delta) => {
    frameAccumulatorRef.current += delta
    if (frameAccumulatorRef.current < TOOLBAR_GEOMETRY_FRAME_INTERVAL_SECONDS) {
      return
    }

    frameAccumulatorRef.current = 0
    emit('frame')
  })
}
