import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from 'react'
import { type Object3D } from 'three'
import { getMeshes } from '@/lib/three/get-meshes'
import type { FurnitureItem } from './objects/furniture.types'

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
  onSelectionChange,
}: {
  furniture: FurnitureItem[]
  onSelectionChange?: (item: FurnitureItem | null) => void
}): SceneSelectionState {
  const objectRefs = useRef(new Map<string, Object3D>())
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedObject, setSelectedObject] = useState<Object3D | null>(null)
  const selectedFurniture = useMemo(
    () => furniture.find((item) => item.id === selectedId) ?? null,
    [furniture, selectedId],
  )
  const selection = useMemo(
    () => (selectedObject ? getMeshes(selectedObject) : []),
    [selectedObject],
  )

  useEffect(() => {
    onSelectionChange?.(selectedFurniture)
  }, [onSelectionChange, selectedFurniture])

  const setSelectedIdAndResolveObject = useCallback((id: string | null) => {
    setSelectedId(id)
    setSelectedObject(id ? (objectRefs.current.get(id) ?? null) : null)
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

  const registerObject = useCallback(
    (id: string, object: Object3D | null) => {
      if (object) {
        objectRefs.current.set(id, object)

        if (selectedId === id) {
          setSelectedObject(object)
        }

        return
      }

      objectRefs.current.delete(id)

      if (selectedId === id) {
        setSelectedObject(null)
      }
    },
    [selectedId],
  )

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
