import { Canvas } from '@react-three/fiber'
import { useCallback, useMemo } from 'react'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene } from '@/scene/scene'
import { CollectionLoader } from '@/scene/collection-loader'
import {
  collectionLoadingActions,
  useActiveOnDemandCollectionPaths,
  useGatedCollectionPaths,
} from '@/core/stores/collection-loading-store'
import { notifyAssetError } from '@/core/operations/startup-coordinator'
import { selectByCanvasPointer } from '@/core/operations/selection-actions'
import { previewFromScene } from '@/core/operations/preview-actions'
import { whenPrefetched } from '@/core/operations/furniture-asset-prefetch'
import { streamFetch } from '@/core/operations/stream-fetch'
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

// The code-split boundary for the 3D engine (three + r3f + drei + postprocessing):
// lazily imported by editor-body, with nothing here imported statically from the
// shell. It also owns the gated-vs-on-demand byte policy for the loader (where a
// collection's bytes come from). See docs/architecture/startup-and-asset-loading.md.
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

  // Gated collections reuse the prefetched bytes; on-demand ones stream on first
  // use (a stall timeout bounds them and the byte progress drives the drawer's
  // "Adding... N%"). Either way a collection is fetched at most once per session.
  const resolveBytes = useCallback(
    (path: string): Promise<ArrayBuffer> => {
      if (gatedCollectionPaths.includes(path)) {
        return whenPrefetched(path)
      }
      return streamFetch(path, {
        onProgress: (progress) => {
          collectionLoadingActions.setProgress(path, progress)
        },
      })
    },
    [gatedCollectionPaths],
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

      {/* Keyed by epoch so a retry remounts with a fresh loader and reloads the
          re-prefetched gated bytes. */}
      <CollectionLoader
        key={sceneEpoch}
        collectionPaths={collectionPaths}
        resolveBytes={resolveBytes}
      />
    </Canvas>
  )
}
