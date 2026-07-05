import { Canvas } from '@react-three/fiber'
import { useMemo } from 'react'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene } from '@/scene/scene'
import { CollectionLoader } from '@/scene/collection-loader'
import {
  useActiveOnDemandCollectionPaths,
  useGatedCollectionPaths,
} from '@/core/stores/collection-loading-store'
import { notifyAssetError } from '@/core/operations/startup-coordinator'
import { selectByCanvasPointer } from '@/core/operations/selection-actions'
import { previewFromScene } from '@/core/operations/preview-actions'
import {
  fetchCollectionBytes,
  releaseCollectionBytes,
} from '@/core/operations/collection-bytes'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { useSceneEpoch } from '@/core/stores/editor-lifecycle-store'
import { useCatalogEntries, useCollections } from '@/core/stores/assets-store'
import { usePreviewedId } from '@/core/operations/previewed-id'
import { useActiveFinishIds } from '@/core/operations/active-finish-ids'
import { SceneAssetErrorBoundary } from './scene-asset-error-boundary'
import { resolveRenderQuality } from './render-quality'

export interface SceneCanvasProps {
  onPointerMissed: () => void
}

// All collections resolve through the shared byte source (warmed for gated paths
// at bootstrap, started on first use otherwise); the buffer is released once
// handed to the loader - the parsed scene supersedes it.
function resolveCollectionBytes(path: string): Promise<ArrayBuffer> {
  return fetchCollectionBytes(path).finally(() => {
    releaseCollectionBytes(path)
  })
}

// The code-split boundary for the 3D engine (three + r3f + drei + postprocessing):
// lazily imported by editor-body, with nothing here imported statically from the
// shell. See docs/architecture/startup-and-asset-loading.md.
export default function SceneCanvas({ onPointerMissed }: SceneCanvasProps) {
  const sceneEpoch = useSceneEpoch()
  const catalog = useCatalogEntries()
  const collections = useCollections()
  const gatedCollectionPaths = useGatedCollectionPaths()
  const onDemandCollectionPaths = useActiveOnDemandCollectionPaths()
  const collectionPaths = useMemo(
    () => [...gatedCollectionPaths, ...onDemandCollectionPaths],
    [gatedCollectionPaths, onDemandCollectionPaths],
  )
  const previewedId = usePreviewedId()
  const {
    selectedFloorOption,
    selectedWallOption,
    selectedLightingMoodOption,
  } = useActiveFinishIds()
  const { renderQuality, shadowMode, exposure } = resolveRenderQuality()

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
      {/* Validation/render failures surface via the error boundary. */}
      <SceneAssetErrorBoundary key={sceneEpoch} onError={notifyAssetError}>
        <Scene
          renderQuality={renderQuality}
          catalog={catalog}
          collections={collections}
          onCanvasPointerSelection={selectByCanvasPointer}
          previewedId={previewedId}
          onPreviewChange={previewFromScene}
          floorOption={selectedFloorOption}
          wallOption={selectedWallOption}
          lightingMoodOption={selectedLightingMoodOption}
          onFloorLoadingChange={sceneDocumentActions.setFloorFinishLoading}
        />
      </SceneAssetErrorBoundary>

      {/* Keyed by epoch so a retry remounts with a fresh loader and re-downloads
          through the cleared byte source. */}
      <CollectionLoader
        key={sceneEpoch}
        collectionPaths={collectionPaths}
        resolveBytes={resolveCollectionBytes}
      />
    </Canvas>
  )
}
