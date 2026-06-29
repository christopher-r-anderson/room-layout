import { Canvas } from '@react-three/fiber'
import {
  Suspense,
  use,
  useMemo,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene } from '@/scene/scene'
import {
  completeAssetLoad,
  notifyAssetError,
} from '@/core/operations/startup-coordinator'
import { selectByCanvasPointer } from '@/core/operations/selection-actions'
import { previewFromScene } from '@/core/operations/preview-actions'
import { sceneDocumentActions } from '@/core/stores/scene-document-store'
import { SceneAssetErrorBoundary } from './scene-asset-error-boundary'
import { getSeedPromise } from './seed-gltf-cache'

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

type SceneProps = ComponentProps<typeof Scene>

export interface SceneCanvasProps {
  isE2ELowRenderQuality: boolean
  canvasShadowMode: false | 'percentage'
  sceneEpoch: number
  onPointerMissed: () => void
  catalog: SceneProps['catalog']
  collections: SceneProps['collections']
  previewedId: SceneProps['previewedId']
  selectedFloorOption: SceneProps['floorOption']
  selectedWallOption: SceneProps['wallOption']
  selectedLightingMoodOption: SceneProps['lightingMoodOption']
}

// The 3D engine (three + r3f + drei + postprocessing) is isolated behind this
// module so it can be code-split out of the initial shell bundle via React.lazy
// in editor-body. Nothing here is imported statically from the shell.
export default function SceneCanvas({
  isE2ELowRenderQuality,
  canvasShadowMode,
  sceneEpoch,
  onPointerMissed,
  catalog,
  collections,
  previewedId,
  selectedFloorOption,
  selectedWallOption,
  selectedLightingMoodOption,
}: SceneCanvasProps) {
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
        gl.toneMappingExposure = isE2ELowRenderQuality ? 1 : 1.05
      }}
      onPointerMissed={onPointerMissed}
      shadows={canvasShadowMode}
    >
      <SceneAssetErrorBoundary key={sceneEpoch} onError={notifyAssetError}>
        <Suspense fallback={null}>
          <SeedGltfCacheGate epoch={sceneEpoch} paths={collectionPaths}>
            <Scene
              renderQuality={isE2ELowRenderQuality ? 'e2e-low' : 'default'}
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
