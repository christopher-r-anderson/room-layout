import { Canvas } from '@react-three/fiber'
import { Suspense, use, useMemo, type ReactNode } from 'react'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene } from '@/scene/scene'
import {
  completeAssetLoad,
  notifyAssetError,
} from '@/core/operations/startup-coordinator'
import { selectByCanvasPointer } from '@/core/operations/selection-actions'
import { previewFromScene } from '@/core/operations/preview-actions'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { useSceneEpoch } from '@/core/stores/editor-lifecycle-store'
import { useCatalogEntries, useCollections } from '@/core/stores/assets-store'
import { usePreviewedId } from '@/core/operations/previewed-id'
import { useActiveFinishIds } from '@/core/operations/active-finish-ids'
import { SceneAssetErrorBoundary } from './scene-asset-error-boundary'
import { getSeedPromise } from './seed-gltf-cache'
import { resolveRenderQuality } from './render-quality'

// Suspends until the engine-free prefetch's buffers are seeded into THREE.Cache,
// so the wrapped Scene's useGLTF parses from memory instead of refetching. Keyed
// by the scene epoch so a retry re-seeds the freshly prefetched buffers.
function SeedGltfCacheGate({
  epoch,
  paths,
  children,
}: {
  epoch: number
  paths: string[]
  children: ReactNode
}) {
  use(getSeedPromise(epoch, paths))
  return children
}

export interface SceneCanvasProps {
  onPointerMissed: () => void
}

// The 3D engine (three + r3f + drei + postprocessing) is isolated behind this
// module so it can be code-split out of the initial shell bundle via React.lazy
// in editor-body. Nothing here is imported statically from the shell.
export default function SceneCanvas({ onPointerMissed }: SceneCanvasProps) {
  const sceneEpoch = useSceneEpoch()
  const catalog = useCatalogEntries()
  const collections = useCollections()
  const previewedId = usePreviewedId()
  const {
    selectedFloorOption,
    selectedWallOption,
    selectedLightingMoodOption,
  } = useActiveFinishIds()
  const { renderQuality, shadowMode, exposure } = resolveRenderQuality()
  const collectionPaths = useMemo(
    () => collections.map((collection) => collection.sourcePath),
    [collections],
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
      <SceneAssetErrorBoundary key={sceneEpoch} onError={notifyAssetError}>
        <Suspense fallback={null}>
          <SeedGltfCacheGate epoch={sceneEpoch} paths={collectionPaths}>
            <Scene
              renderQuality={renderQuality}
              catalog={catalog}
              collections={collections}
              onCanvasPointerSelection={selectByCanvasPointer}
              onAssetsReady={completeAssetLoad}
              previewedId={previewedId}
              onPreviewChange={previewFromScene}
              floorOption={selectedFloorOption}
              wallOption={selectedWallOption}
              lightingMoodOption={selectedLightingMoodOption}
              onFloorLoadingChange={sceneDocumentActions.setFloorFinishLoading}
            />
          </SeedGltfCacheGate>
        </Suspense>
      </SceneAssetErrorBoundary>
    </Canvas>
  )
}
