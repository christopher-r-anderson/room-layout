import { Canvas } from '@react-three/fiber'
import { Suspense, type ComponentProps } from 'react'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene } from '@/scene/scene'
import {
  completeAssetLoad,
  notifyAssetError,
} from '@/core/operations/startup-coordinator'
import { SceneAssetErrorBoundary } from './scene-asset-error-boundary'

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
  onCanvasPointerSelection: NonNullable<SceneProps['onCanvasPointerSelection']>
  onScenePreviewChange: NonNullable<SceneProps['onPreviewChange']>
  onFloorLoadingChange: NonNullable<SceneProps['onFloorLoadingChange']>
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
  onCanvasPointerSelection,
  onScenePreviewChange,
  onFloorLoadingChange,
}: SceneCanvasProps) {
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
          <Scene
            renderQuality={isE2ELowRenderQuality ? 'e2e-low' : 'default'}
            catalog={catalog}
            collections={collections}
            onCanvasPointerSelection={onCanvasPointerSelection}
            onAssetsReady={completeAssetLoad}
            previewedId={previewedId}
            onPreviewChange={onScenePreviewChange}
            floorOption={selectedFloorOption}
            wallOption={selectedWallOption}
            onFloorLoadingChange={onFloorLoadingChange}
          />
        </Suspense>
      </SceneAssetErrorBoundary>
    </Canvas>
  )
}
