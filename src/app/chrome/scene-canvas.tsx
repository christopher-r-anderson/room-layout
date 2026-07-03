import { Canvas } from '@react-three/fiber'
import { useCallback } from 'react'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene, CollectionLoader } from '@/scene/scene'
import { useActiveOnDemandCollectionPaths } from '@/scene/scene-commands'
import {
  completeAssetLoad,
  notifyAssetError,
} from '@/core/operations/startup-coordinator'
import { selectByCanvasPointer } from '@/core/operations/selection-actions'
import { previewFromScene } from '@/core/operations/preview-actions'
import { whenPrefetched } from '@/core/operations/furniture-asset-prefetch'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { useSceneEpoch } from '@/core/stores/editor-lifecycle-store'
import { useGatedCollectionPaths } from '@/core/stores/startup-gate-store'
import { useCatalogEntries, useCollections } from '@/core/stores/assets-store'
import { usePreviewedId } from '@/core/operations/previewed-id'
import { useActiveFinishIds } from '@/core/operations/active-finish-ids'
import { SceneAssetErrorBoundary } from './scene-asset-error-boundary'
import { resolveRenderQuality } from './render-quality'

export interface SceneCanvasProps {
  onPointerMissed: () => void
}

// The 3D engine (three + r3f + drei + postprocessing) is isolated behind this
// module so it can be code-split out of the initial shell bundle via React.lazy
// in editor-body. Nothing here is imported statically from the shell.
//
// Environment-first loading: <Scene> renders the room/lighting/camera
// immediately and reads parsed collections from a store, so it never suspends on
// furniture. <CollectionLoader> loads collections imperatively - gated ones
// from the startup prefetch (which gate the unlock; a failure surfaces the
// startup error) and on-demand ones from a direct fetch (isolated failures).
export default function SceneCanvas({ onPointerMissed }: SceneCanvasProps) {
  const sceneEpoch = useSceneEpoch()
  const catalog = useCatalogEntries()
  const collections = useCollections()
  const gatedCollectionPaths = useGatedCollectionPaths()
  const onDemandCollectionPaths =
    useActiveOnDemandCollectionPaths(gatedCollectionPaths)
  const previewedId = usePreviewedId()
  const {
    selectedFloorOption,
    selectedWallOption,
    selectedLightingMoodOption,
  } = useActiveFinishIds()
  const { renderQuality, shadowMode, exposure } = resolveRenderQuality()

  // Gated collections reuse the streamed prefetch bytes (also feeds the loader
  // progress); on-demand collections are fetched directly on first use. In both
  // cases the loader parses the bytes straight into the scene store, so a
  // collection is fetched at most once per session without relying on HTTP cache
  // headers.
  const resolveBytes = useCallback(
    (path: string, gated: boolean): Promise<ArrayBuffer> => {
      if (gated) {
        return whenPrefetched(path)
      }
      return fetch(path).then((response) => {
        if (!response.ok) {
          throw new Error(
            `Failed to fetch furniture collection ${path}: ${String(response.status)}`,
          )
        }
        return response.arrayBuffer()
      })
    },
    [],
  )

  return (
    <Canvas
      camera={{
        position: [3, 2.5, 3],
        fov: 50,
      }}
      frameloop="demand"
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace
        gl.toneMapping = NeutralToneMapping
        gl.toneMappingExposure = exposure
      }}
      onPointerMissed={onPointerMissed}
      shadows={shadowMode}
    >
      {/* Scene renders the environment now and furniture as collections register;
          validation/render failures surface via the error boundary. */}
      <SceneAssetErrorBoundary key={sceneEpoch} onError={notifyAssetError}>
        <Scene
          renderQuality={renderQuality}
          catalog={catalog}
          collections={collections}
          gatedCollectionPaths={gatedCollectionPaths}
          onCanvasPointerSelection={selectByCanvasPointer}
          onAssetsReady={completeAssetLoad}
          previewedId={previewedId}
          onPreviewChange={previewFromScene}
          floorOption={selectedFloorOption}
          wallOption={selectedWallOption}
          lightingMoodOption={selectedLightingMoodOption}
          onFloorLoadingChange={sceneDocumentActions.setFloorFinishLoading}
        />
      </SceneAssetErrorBoundary>

      {/* Keyed by epoch so a retry remounts with a fresh loader and reloads the
          re-prefetched gated bytes. */}
      <CollectionLoader
        key={sceneEpoch}
        gatedCollectionPaths={gatedCollectionPaths}
        onDemandCollectionPaths={onDemandCollectionPaths}
        resolveBytes={resolveBytes}
        onGatedError={notifyAssetError}
      />
    </Canvas>
  )
}
