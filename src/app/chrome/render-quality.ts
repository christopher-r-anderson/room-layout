export interface RenderQualitySettings {
  renderQuality: 'e2e-low' | 'default'
  shadowMode: false | 'percentage'
  exposure: number
}

// Resolves the render-quality settings SceneCanvas applies: scene detail tier,
// shadow mode, and tone-mapping exposure. The e2e override forces deterministic
// low quality so visual tests stay stable.
export function resolveRenderQuality(): RenderQualitySettings {
  const e2eLowQuality = import.meta.env.VITE_E2E_RENDER_QUALITY === 'low'

  return e2eLowQuality
    ? { renderQuality: 'e2e-low', shadowMode: false, exposure: 1 }
    : { renderQuality: 'default', shadowMode: 'percentage', exposure: 1.05 }
}
