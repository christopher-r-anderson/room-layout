import { Canvas } from '@react-three/fiber'
import {
  Component,
  Suspense,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene } from '@/scene/scene'
import { useIsBlockingOverlayOpen } from '@/core/stores/dialog-store'
import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import {
  selectionMetaActions,
  useRoomViewFocusRequest,
} from '@/core/stores/selection-meta-store'
import { useSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import {
  useEditorInteractionsEnabled,
  useSceneEpoch,
  useStartupLoadingActive,
} from '@/core/stores/editor-lifecycle-store'
import {
  useCatalogEntries,
  useCollections,
} from '@/core/stores/assets-store'
import {
  completeAssetLoad,
  notifyAssetError,
} from '@/core/operations/startup-coordinator'
import {
  useAssertiveAnnouncement,
  usePoliteAnnouncement,
} from '@/core/stores/announcement-store'
import { useKeyboardShortcuts } from '@/features/keyboard/use-keyboard-shortcuts'
import { useCameraKeyState } from '@/features/keyboard/use-camera-key-state'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { Announcer } from '@/features/scene-panel/announcer'
import { Toaster } from '@/shared/ui/sonner'
import { EditorOverlay, type EditorOverlayProps } from './editor-overlay'

class SceneAssetErrorBoundary extends Component<
  {
    children: ReactNode
    onError: (error: Error) => void
  },
  { hasError: boolean }
> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    this.props.onError(error)
  }

  render() {
    if (this.state.hasError) {
      return null
    }

    return this.props.children
  }
}

type SceneProps = ComponentProps<typeof Scene>

export interface EditorBodyProps {
  testOverlaysHidden: boolean
  canvasShadowMode: false | 'percentage'
  isE2ELowRenderQuality: boolean
  previewedId: string | null
  selectedFloorOption: SceneProps['floorOption']
  selectedWallOption: SceneProps['wallOption']
  clearPreviewOnCanvasMiss: () => void
  onScenePreviewChange: NonNullable<SceneProps['onPreviewChange']>
  onFloorLoadingChange: NonNullable<SceneProps['onFloorLoadingChange']>
  onCanvasPointerSelection: NonNullable<SceneProps['onCanvasPointerSelection']>
  onClearSelection: () => void
  editorOverlay: EditorOverlayProps
}

export function EditorBody({
  testOverlaysHidden,
  canvasShadowMode,
  isE2ELowRenderQuality,
  previewedId,
  selectedFloorOption,
  selectedWallOption,
  clearPreviewOnCanvasMiss,
  onScenePreviewChange,
  onFloorLoadingChange,
  onCanvasPointerSelection,
  onClearSelection,
  editorOverlay,
}: EditorBodyProps) {
  const [roomViewHasFocus, setRoomViewHasFocus] = useState(false)
  const catalog = useCatalogEntries()
  const collections = useCollections()
  const sceneEpoch = useSceneEpoch()
  const sceneIsAtDefaults = useSceneIsAtDefaults()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const startupLoadingActive = useStartupLoadingActive()
  const selectedFurniture = useSelectedFurniture()
  const politeAnnouncement = usePoliteAnnouncement()
  const assertiveAnnouncement = useAssertiveAnnouncement()
  const { roomViewRef } = useEditorRefs()
  const dispatch = useCommandDispatch()
  const roomViewFocusRequest = useRoomViewFocusRequest()
  const roomViewFocusFrameRef = useRef<number | null>(null)

  const focusRoomView = useCallback(() => {
    if (!editorInteractionsEnabled) {
      return
    }

    if (roomViewFocusFrameRef.current !== null) {
      cancelAnimationFrame(roomViewFocusFrameRef.current)
    }

    roomViewFocusFrameRef.current = requestAnimationFrame(() => {
      roomViewFocusFrameRef.current = null
      roomViewRef.current?.focus()
    })
  }, [editorInteractionsEnabled, roomViewRef])

  useEffect(() => {
    return () => {
      if (roomViewFocusFrameRef.current !== null) {
        cancelAnimationFrame(roomViewFocusFrameRef.current)
      }
    }
  }, [])

  // Consume room-view focus-intent requests (e.g. post-delete) from external
  // coordinators; EditorBody owns the room-view element.
  useEffect(() => {
    if (roomViewFocusRequest === null) {
      return
    }

    focusRoomView()
    selectionMetaActions.clearRoomViewFocusRequest()
  }, [roomViewFocusRequest, focusRoomView])

  useKeyboardShortcuts({
    enabled: editorInteractionsEnabled,
    hasSelection: selectedFurniture !== null,
    isBlockingOverlayOpen,
    canStartOver: !sceneIsAtDefaults,
    roomViewHasFocus,
    dispatch,
  })

  useCameraKeyState({
    enabled: editorInteractionsEnabled,
    isBlockingOverlayOpen,
    roomViewHasFocus,
  })

  return (
    <main
      className="relative size-full"
      aria-busy={startupLoadingActive}
      data-test-overlays-hidden={testOverlaysHidden ? 'true' : 'false'}
    >
      <h1 className="sr-only">Room Layout</h1>
      <p id="scene-instructions" className="sr-only">
        Interactive 3D room editor. Tab to focus the room-view region, then use
        the arrow keys to preview items in the room and Enter or Space to select
        the previewed item. You can also use the furniture in room panel and
        selected item actions and details to rotate, remove, or type exact
        placement changes without dragging.
      </p>
      <section
        aria-describedby="scene-instructions"
        aria-label="Interactive 3D room editor"
        ref={roomViewRef}
        tabIndex={editorInteractionsEnabled ? 0 : -1}
        className="absolute inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
        onFocus={() => {
          flushSync(() => {
            setRoomViewHasFocus(true)
          })
        }}
        onBlur={() => {
          flushSync(() => {
            setRoomViewHasFocus(false)
          })
        }}
        onPointerDownCapture={focusRoomView}
      >
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
          onPointerMissed={() => {
            if (!editorInteractionsEnabled) {
              return
            }

            focusRoomView()
            clearPreviewOnCanvasMiss()
            onClearSelection()
          }}
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
      </section>

      {testOverlaysHidden ? null : <EditorOverlay {...editorOverlay} />}
      <Announcer
        politeMessage={politeAnnouncement}
        assertiveMessage={assertiveAnnouncement}
      />
      <Toaster />
    </main>
  )
}
