import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import {
  HalfFloatType,
  Vector2,
  WebGLRenderTarget,
  type Camera,
  type Object3D,
  type Scene,
} from 'three'
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js'
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js'
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js'

interface OutlineColors {
  visible: number
  hidden: number
  strength: number
}

const SELECTION_OUTLINE: OutlineColors = {
  visible: 0xf59e0b,
  hidden: 0xb45309,
  strength: 3.2,
}
const PREVIEW_OUTLINE: OutlineColors = {
  visible: 0x60a5fa,
  hidden: 0x2563eb,
  strength: 2.1,
}
const OUT_OF_BOUNDS_OUTLINE: OutlineColors = {
  visible: 0xef4444,
  hidden: 0x991b1b,
  strength: 2.6,
}

function makeOutlinePass(
  resolution: Vector2,
  scene: Scene,
  camera: Camera,
  colors: OutlineColors,
) {
  const pass = new OutlinePass(resolution, scene, camera)
  pass.visibleEdgeColor.set(colors.visible)
  pass.hiddenEdgeColor.set(colors.hidden)
  pass.edgeStrength = colors.strength
  pass.edgeGlow = 0
  pass.edgeThickness = 1
  return pass
}

export interface SelectionOutlineEffectProps {
  selection: Object3D[]
  /** Meshes of the hovered or keyboard-focused item. */
  preview: Object3D[]
  /** Meshes of items outside the room walls. */
  outOfBounds: Object3D[]
  lowQuality: boolean
}

/**
 * The composer is an imperative GPU resource held in refs; because the Canvas
 * runs frameloop="demand", this takes over rendering with a priority-1
 * useFrame and re-renders on change via the shared invalidate. Outlining is
 * screen-space: selection/preview changes must stay free of per-object
 * geometry work (the idle-churn e2e gate depends on it).
 */
export function SelectionOutlineEffect({
  selection,
  preview,
  outOfBounds,
  lowQuality,
}: SelectionOutlineEffectProps) {
  const gl = useThree((state) => state.gl)
  const scene = useThree((state) => state.scene)
  const camera = useThree((state) => state.camera)
  const size = useThree((state) => state.size)
  const invalidate = useThree((state) => state.invalidate)

  const composerRef = useRef<EffectComposer | null>(null)
  const selectionPassRef = useRef<OutlinePass | null>(null)
  const previewPassRef = useRef<OutlinePass | null>(null)
  const outOfBoundsPassRef = useRef<OutlinePass | null>(null)

  useEffect(() => {
    const resolution = new Vector2(size.width, size.height)
    // Multisampled HDR target so whole-scene edges stay anti-aliased;
    // disabled in the low-quality e2e build.
    const renderTarget = new WebGLRenderTarget(size.width, size.height, {
      type: HalfFloatType,
      samples: lowQuality ? 0 : 4,
    })
    const composer = new EffectComposer(gl, renderTarget)
    composer.addPass(new RenderPass(scene, camera))

    const selectionPass = makeOutlinePass(
      resolution,
      scene,
      camera,
      SELECTION_OUTLINE,
    )
    composer.addPass(selectionPass)
    const previewPass = makeOutlinePass(
      resolution,
      scene,
      camera,
      PREVIEW_OUTLINE,
    )
    composer.addPass(previewPass)
    // Usually empty (out-of-bounds items only exist after a shrink or an
    // ill-fitting restore), so this pass starts disabled and is enabled with
    // its object set - the composer then skips it entirely on idle frames.
    const outOfBoundsPass = makeOutlinePass(
      resolution,
      scene,
      camera,
      OUT_OF_BOUNDS_OUTLINE,
    )
    outOfBoundsPass.enabled = false
    composer.addPass(outOfBoundsPass)

    composer.addPass(new OutputPass())
    composer.setPixelRatio(gl.getPixelRatio())
    composer.setSize(size.width, size.height)

    composerRef.current = composer
    selectionPassRef.current = selectionPass
    previewPassRef.current = previewPass
    outOfBoundsPassRef.current = outOfBoundsPass
    invalidate()

    return () => {
      selectionPass.dispose()
      previewPass.dispose()
      outOfBoundsPass.dispose()
      composer.dispose()
      composerRef.current = null
      selectionPassRef.current = null
      previewPassRef.current = null
      outOfBoundsPassRef.current = null
    }
    // Recreated only when the renderer/scene/camera or quality changes; size is
    // applied through the resize effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gl, scene, camera, lowQuality, invalidate])

  useEffect(() => {
    const composer = composerRef.current
    if (!composer) {
      return
    }

    composer.setPixelRatio(gl.getPixelRatio())
    composer.setSize(size.width, size.height)
    invalidate()
  }, [gl, size, invalidate])

  useEffect(() => {
    if (selectionPassRef.current) {
      selectionPassRef.current.selectedObjects = selection
    }
    if (previewPassRef.current) {
      previewPassRef.current.selectedObjects = preview
    }
    if (outOfBoundsPassRef.current) {
      outOfBoundsPassRef.current.selectedObjects = outOfBounds
      outOfBoundsPassRef.current.enabled = outOfBounds.length > 0
    }
    invalidate()
  }, [selection, preview, outOfBounds, invalidate])

  useFrame((_, delta) => {
    composerRef.current?.render(delta)
  }, 1)

  return null
}
