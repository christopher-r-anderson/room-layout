import { useCallback, useMemo, useRef, useState, type RefObject } from 'react'
import { type Object3D } from 'three'
import { getMeshes } from '@/scene/internal/three/get-meshes'
import { useSelectedId } from '@/core/stores/selection-store'

interface SceneSelectionState {
  objectRefs: RefObject<Map<string, Object3D>>
  registerObject: (id: string, object: Object3D | null) => void
  selectedId: string | null
  selection: ReturnType<typeof getMeshes>
}

// Selection render state: the Object3D registry the projections/outline read,
// and the outline mesh set for the current selection. The pointer itself lives
// in the core selection store; input maps to it through the core actions.
export function useSceneSelection(): SceneSelectionState {
  const objectRefs = useRef(new Map<string, Object3D>())
  const selectedId = useSelectedId()
  const [registeredObjects, setRegisteredObjects] = useState(
    () => new Map<string, Object3D>(),
  )
  const selectedObject = useMemo(
    () => (selectedId ? (registeredObjects.get(selectedId) ?? null) : null),
    [registeredObjects, selectedId],
  )
  const selection = useMemo(
    () => (selectedObject ? getMeshes(selectedObject) : []),
    [selectedObject],
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
    selectedId,
    selection,
  }
}
