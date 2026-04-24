/**
 * Shared Three.js fixtures for unit and integration tests.
 * Provides consistent test objects to avoid duplication.
 */

import * as THREE from 'three'

/**
 * Dummy mesh fixture with box geometry and standard material.
 */
export function createDummyMesh(): THREE.Mesh {
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const material = new THREE.MeshStandardMaterial({ color: 0xff0000 })
  return new THREE.Mesh(geometry, material)
}

/**
 * Dummy scene fixture with basic lighting.
 */
export function createDummyScene(): THREE.Scene {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xcccccc)

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
  const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8)
  directionalLight.position.set(5, 10, 7)

  scene.add(ambientLight, directionalLight)

  return scene
}

/**
 * Standard material fixture used by furniture-like meshes.
 */
export function createStandardMaterial(
  color = 0x888888,
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    metalness: 0.5,
    roughness: 0.7,
  })
}

/**
 * Highlight material fixture used for selection state.
 */
export function createHighlightMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffff00,
    emissive: 0xffff00,
    emissiveIntensity: 0.5,
    metalness: 0.3,
    roughness: 0.3,
  })
}

/**
 * Box geometry fixture with common furniture dimensions.
 */
export function createFurnitureGeometry(
  width = 1,
  height = 1,
  depth = 1,
): THREE.BoxGeometry {
  return new THREE.BoxGeometry(width, height, depth)
}

/**
 * Raycaster fixture for pointer intersection tests.
 */
export function createRayFromScreen(
  screenX = 0.5,
  screenY = 0.5,
  camera: THREE.Camera = new THREE.PerspectiveCamera(),
): THREE.Raycaster {
  const raycaster = new THREE.Raycaster()
  const mouse = new THREE.Vector2(screenX * 2 - 1, -(screenY * 2 - 1))
  raycaster.setFromCamera(mouse, camera)
  return raycaster
}
