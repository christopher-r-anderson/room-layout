import { Canvas } from '@react-three/fiber'
import {
  Component,
  Suspense,
  useState,
  type ComponentProps,
  type Key,
  type ReactNode,
} from 'react'
import { flushSync } from 'react-dom'
import { NeutralToneMapping, SRGBColorSpace } from 'three'
import { Scene } from '@/scene/scene'
import { useIsBlockingOverlayOpen } from '@/editor-state/dialog-store'
import { useSelectedFurniture } from '@/editor-state/scene-state-store'
import {
  useEditorInteractionsEnabled,
  useStartupLoadingActive,
} from '@/editor-state/editor-runtime-store'
import { useKeyboardShortcuts } from '@/features/keyboard/use-keyboard-shortcuts'
import { useCameraKeyState } from '@/features/keyboard/use-camera-key-state'
import { useCommandDispatch } from '@/editor-state/command-dispatch-context'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { Announcer } from '@/features/scene-panel/announcer'
import { Toaster } from '@/shared/ui/sonner'
import { EditorShell } from './editor-shell'
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
  catalog: SceneProps['catalog']
  collections: SceneProps['collections']
  cacheInvalidationKey: Key
  testOverlaysHidden: boolean
  sceneIsAtDefaults: boolean
  focusRoomView: () => void
  canvasShadowMode: false | 'percentage'
  isE2ELowRenderQuality: boolean
  previewedId: string | null
  selectedFloorOption: SceneProps['floorOption']
  selectedWallOption: SceneProps['wallOption']
  clearPreviewOnCanvasMiss: () => void
  onScenePreviewChange: NonNullable<SceneProps['onPreviewChange']>
  onFloorLoadingChange: NonNullable<SceneProps['onFloorLoadingChange']>
  onCanvasPointerSelection: NonNullable<SceneProps['onCanvasPointerSelection']>
  onSceneAssetsReady: NonNullable<SceneProps['onAssetsReady']>
  onSceneAssetError: (error: Error) => void
  onClearSelection: () => void
  politeAnnouncement: string
  assertiveAnnouncement: string
  editorOverlay: EditorOverlayProps
}

export function EditorBody({
  catalog,
  collections,
  cacheInvalidationKey,
  testOverlaysHidden,
  sceneIsAtDefaults,
  focusRoomView,
  canvasShadowMode,
  isE2ELowRenderQuality,
  previewedId,
  selectedFloorOption,
  selectedWallOption,
  clearPreviewOnCanvasMiss,
  onScenePreviewChange,
  onFloorLoadingChange,
  onCanvasPointerSelection,
  onSceneAssetsReady,
  onSceneAssetError,
  onClearSelection,
  politeAnnouncement,
  assertiveAnnouncement,
  editorOverlay,
}: EditorBodyProps) {
  const [roomViewHasFocus, setRoomViewHasFocus] = useState(false)
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const startupLoadingActive = useStartupLoadingActive()
  const selectedFurniture = useSelectedFurniture()
  const { roomViewRef } = useEditorRefs()
  const dispatch = useCommandDispatch()

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
    <EditorShell>
      <main
        className="relative size-full"
        aria-busy={startupLoadingActive}
        data-test-overlays-hidden={testOverlaysHidden ? 'true' : 'false'}
      >
        <h1 className="sr-only">Room Layout</h1>
        <p id="scene-instructions" className="sr-only">
          Interactive 3D room editor. Tab to focus the room-view region, then
          use the arrow keys to preview items in the room and Enter or Space to
          select the previewed item. You can also use the furniture in room
          panel and selected item actions and details to rotate, remove, or type
          exact placement changes without dragging.
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
            <SceneAssetErrorBoundary
              key={cacheInvalidationKey}
              onError={onSceneAssetError}
            >
              <Suspense fallback={null}>
                <Scene
                  renderQuality={isE2ELowRenderQuality ? 'e2e-low' : 'default'}
                  catalog={catalog}
                  collections={collections}
                  onCanvasPointerSelection={onCanvasPointerSelection}
                  onAssetsReady={onSceneAssetsReady}
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
    </EditorShell>
  )
}
