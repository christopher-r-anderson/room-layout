import { Canvas } from '@react-three/fiber'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene } from '@/scene/scene'
import { notifyAssetError } from '@/core/operations/startup-coordinator'
import { previewFromScene } from '@/core/operations/preview-actions'
import { useStartupCycle } from '@/core/stores/editor-lifecycle-store'
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
// shell. Collection loading is driven from core - its reconciler kicks in once
// the Scene mounts and registers its parse service. See
// docs/architecture/startup-and-asset-loading.md.
export default function SceneCanvas({ onPointerMissed }: SceneCanvasProps) {
  const startupCycle = useStartupCycle()
  const catalog = useCatalogEntries()
  const collections = useCollections()
  const previewedId = usePreviewedId()
  const {
    selectedFloorOption,
    selectedWallOption,
    selectedLightingMoodOption,
  } = useActiveFinishIds()
  const { renderQuality, shadowMode, exposure } = resolveRenderQuality()

  return (
    <Canvas
      camera={{ fov: 50 }}
      frameloop="demand"
      onCreated={({ gl }) => {
        gl.outputColorSpace = SRGBColorSpace
        gl.toneMapping = NeutralToneMapping
        gl.toneMappingExposure = exposure
      }}
      onPointerMissed={onPointerMissed}
      shadows={shadowMode}
    >
      {/* Render failures surface via the error boundary. Keyed by the
          startup cycle so a retry remounts a fresh Scene, whose remount
          re-kicks the collection loads through the cleared byte source. */}
      <SceneAssetErrorBoundary key={startupCycle} onError={notifyAssetError}>
        <Scene
          renderQuality={renderQuality}
          catalog={catalog}
          collections={collections}
          previewedId={previewedId}
          onPreviewChange={previewFromScene}
          floorOption={selectedFloorOption}
          wallOption={selectedWallOption}
          lightingMoodOption={selectedLightingMoodOption}
        />
      </SceneAssetErrorBoundary>
    </Canvas>
  )
}
