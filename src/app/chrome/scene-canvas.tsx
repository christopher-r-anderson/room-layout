import { Canvas } from '@react-three/fiber'
import { Suspense, use, type ReactNode } from 'react'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene, CollectionLoader } from '@/scene/scene'
import { useActiveOnDemandCollectionPaths } from '@/scene/scene-commands'
import {
  completeAssetLoad,
  notifyAssetError,
} from '@/core/operations/startup-coordinator'
import { selectByCanvasPointer } from '@/core/operations/selection-actions'
import { previewFromScene } from '@/core/operations/preview-actions'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { useSceneEpoch } from '@/core/stores/editor-lifecycle-store'
import { useGatedCollectionPaths } from '@/core/stores/startup-gate-store'
import { useCatalogEntries, useCollections } from '@/core/stores/assets-store'
import { usePreviewedId } from '@/core/operations/previewed-id'
import { useActiveFinishIds } from '@/core/operations/active-finish-ids'
import { SceneAssetErrorBoundary } from './scene-asset-error-boundary'
import { OnDemandAssetErrorBoundary } from './on-demand-asset-error-boundary'
import { getSeedPromise } from './seed-gltf-cache'
import { resolveRenderQuality } from './render-quality'

// Suspends until the engine-free prefetch's buffers are seeded into THREE.Cache,
// so the wrapped gated CollectionLoaders parse from memory instead of refetching.
// Keyed by the scene epoch so a retry re-seeds the freshly prefetched buffers.
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
//
// Environment-first loading: <Scene> renders the room/lighting/camera
// immediately - it never suspends on furniture. Collections load in sibling
// loaders under their own Suspense boundaries:
//   - Gated collections (the restored scene's) are seeded from the startup
//     prefetch and gate the editor unlock; a failure surfaces the startup error.
//   - On-demand collections (added post-unlock) load directly and in isolation;
//     a failure never blocks the editor.
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
      {/* The scene renders the environment now and furniture as collections
          register; validation/gated-load failures surface as startup errors. */}
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
        <Suspense fallback={null}>
          <SeedGltfCacheGate epoch={sceneEpoch} paths={gatedCollectionPaths}>
            {gatedCollectionPaths.map((path) => (
              <CollectionLoader key={path} path={path} />
            ))}
          </SeedGltfCacheGate>
        </Suspense>
      </SceneAssetErrorBoundary>

      {onDemandCollectionPaths.map((path) => (
        <OnDemandAssetErrorBoundary key={path} path={path}>
          <Suspense fallback={null}>
            <CollectionLoader path={path} />
          </Suspense>
        </OnDemandAssetErrorBoundary>
      ))}
    </Canvas>
  )
}
