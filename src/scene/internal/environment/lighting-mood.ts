import type { LightingMoodOption } from '@/domain/environment-materials'

// The fallback mood reproduces the room's neutral "Daylight" rig. It backstops
// the first frames before the manifest-driven config resolves, and the brief
// window where a stored mood id is unknown, so the scene always has a full rig.
export const DEFAULT_LIGHTING_MOOD: LightingMoodOption = {
  id: 'daylight',
  label: 'Daylight',
  exposure: 1.05,
  ambientIntensity: 0.18,
  hemisphereSkyColor: 0xf1f6ff,
  hemisphereGroundColor: 0xaeb9c9,
  hemisphereIntensity: 0.35,
  keyLightColor: 0xfdf9f3,
  keyLightIntensity: 1,
  fillLightColor: 0xd5e4ff,
  fillLightIntensity: 0.28,
  environmentColor: 0xdce6f3,
  environmentIntensity: 0.4,
  backgroundIntensity: 0.95,
}

/** The resolved mood, or the default rig when no mood is available yet. */
export function resolveLightingMood(
  mood: LightingMoodOption | null | undefined,
): LightingMoodOption {
  return mood ?? DEFAULT_LIGHTING_MOOD
}

/**
 * The renderer tone-mapping exposure for the active mood. The e2e low-quality
 * lane pins exposure to 1 so screenshots stay deterministic regardless of mood.
 */
export function resolveMoodExposure(
  mood: LightingMoodOption | null | undefined,
  lowQuality: boolean,
): number {
  return lowQuality ? 1 : resolveLightingMood(mood).exposure
}
