import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'
import { type Object3D } from 'three'
import { getMeshes } from '@/lib/three/get-meshes'
import {
  sceneStateActions,
  useSelectedId,
} from '@/editor-state/scene-contracts'
import type { FurnitureItem } from '../objects/furniture.types'

interface SceneSelectionState {
  objectRefs: RefObject<Map<string, Object3D>>
  registerObject: (id: string, object: Object3D | null) => void
  selectFurniture: (id: string | null) => void
  selectedFurniture: FurnitureItem | null
  selectedId: string | null
  selection: ReturnType<typeof getMeshes>
  setSelectedIdAndResolveObject: (id: string | null) => void
}

export function useSceneSelection({
  furniture,
}: {
  furniture: FurnitureItem[]
}): SceneSelectionState {
  const objectRefs = useRef(new Map<string, Object3D>())
  const selectedId = useSelectedId()
  const [registeredObjects, setRegisteredObjects] = useState(
    () => new Map<string, Object3D>(),
  )
  const selectedFurniture = useMemo(
    () => furniture.find((item) => item.id === selectedId) ?? null,
    [furniture, selectedId],
  )
  const selectedObject = useMemo(
    () => (selectedId ? (registeredObjects.get(selectedId) ?? null) : null),
    [registeredObjects, selectedId],
  )
  const selection = useMemo(
    () => (selectedObject ? getMeshes(selectedObject) : []),
    [selectedObject],
  )

  const setSelectedIdAndResolveObject = useCallback((id: string | null) => {
    sceneStateActions.setSelectedId(id)
  }, [])

  const setSelection = useCallback(
    (item: FurnitureItem | null) => {
      setSelectedIdAndResolveObject(item?.id ?? null)
    },
    [setSelectedIdAndResolveObject],
  )

  const selectFurniture = useCallback(
    (id: string | null) => {
      const nextSelection = id
        ? (furniture.find((item) => item.id === id) ?? null)
        : null

      setSelection(nextSelection)
    },
    [furniture, setSelection],
  )

  const registerObject = useCallback((id: string, object: Object3D | null) => {
    if (object) {
      objectRefs.current.set(id, object)

      setRegisteredObjects((currentObjects) => {
        if (currentObjects.get(id) === object) {
          return currentObjects
        }

        const nextObjects = new Map(currentObjects)
        nextObjects.set(id, object)
        return nextObjects
      })

      return
    }

    objectRefs.current.delete(id)

    setRegisteredObjects((currentObjects) => {
      if (!currentObjects.has(id)) {
        return currentObjects
      }

      const nextObjects = new Map(currentObjects)
      nextObjects.delete(id)
      return nextObjects
    })
  }, [])

  return {
    objectRefs,
    registerObject,
    selectFurniture,
    selectedFurniture,
    selectedId,
    selection,
    setSelectedIdAndResolveObject,
  }
}
