import { expect, it } from 'vitest'
import type { LightingMoodOption } from '@/domain/environment-materials'
import {
  DEFAULT_LIGHTING_MOOD,
  resolveLightingMood,
  resolveMoodExposure,
} from './lighting-mood'

const WARM_MOOD: LightingMoodOption = {
  id: 'warm-white',
  label: 'Warm White',
  exposure: 0.95,
  ambientIntensity: 0.32,
  hemisphereSkyColor: 0xfff3e2,
  hemisphereGroundColor: 0xc7b29a,
  hemisphereIntensity: 0.5,
  keyLightColor: 0xffe9c7,
  keyLightIntensity: 1,
  fillLightColor: 0xffd9b0,
  fillLightIntensity: 0.26,
  environmentColor: 0xf0e3d2,
  environmentIntensity: 0.7,
  backgroundIntensity: 0.92,
}

it('returns the provided mood when one is given', () => {
  expect(resolveLightingMood(WARM_MOOD)).toBe(WARM_MOOD)
})

it('falls back to the default daylight rig when no mood is available', () => {
  expect(resolveLightingMood(null)).toBe(DEFAULT_LIGHTING_MOOD)
  expect(resolveLightingMood(undefined)).toBe(DEFAULT_LIGHTING_MOOD)
})

it('exposes the mood exposure for the default render lane', () => {
  expect(resolveMoodExposure(WARM_MOOD, false)).toBe(0.95)
})

it('falls back to the default exposure when no mood is available', () => {
  expect(resolveMoodExposure(null, false)).toBe(DEFAULT_LIGHTING_MOOD.exposure)
})

it('pins exposure to 1 in the low-quality lane regardless of mood', () => {
  expect(resolveMoodExposure(WARM_MOOD, true)).toBe(1)
  expect(resolveMoodExposure(null, true)).toBe(1)
})
