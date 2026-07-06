import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Trans, useLingui } from '@lingui/react/macro'
import { useIsBlockingOverlayOpen } from '@/core/stores/dialog-store'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import {
  selectionActions,
  useRoomViewFocusRequest,
} from '@/core/stores/selection-store'
import { useSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import {
  useAssetError,
  useEditorInteractionsEnabled,
  useStartupLoadingActive,
  useStartupOverlayActive,
} from '@/core/stores/editor-lifecycle-store'
import { InitializationError } from '@/features/startup/initialization-error'
import { InitializationProgress } from '@/features/startup/initialization-progress'
import { useKeyboardShortcuts } from '@/features/keyboard/use-keyboard-shortcuts'
import { useCameraKeyState } from '@/features/keyboard/use-camera-key-state'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { clearCanvasSelection } from '@/core/operations/selection-actions'
import { APP_NAME } from '@/shared/messages/app-identity'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { Announcer } from './feedback/announcer'
import { withStartupChunkRetry } from './startup-chunk-retry'
import { Toaster } from '@/shared/ui/sonner'

// The 3D engine (three/r3f/drei) lives in this lazily-imported chunk so it
// downloads in parallel with — and never blocks — the initial shell paint.
const SceneCanvas = lazy(withStartupChunkRetry(() => import('./scene-canvas')))

// The editor chrome is code-split into its own chunk and mounts only once the
// editor is ready, so it stays out of the initial shell (which keeps just the
// loading/error UI and the canvas boundary).
const importEditorChrome = () => import('./editor-overlay')
const EditorOverlay = lazy(
  withStartupChunkRetry(() =>
    importEditorChrome().then((module) => ({ default: module.EditorOverlay })),
  ),
)

export interface EditorBodyProps {
  testOverlaysHidden: boolean
}

export function EditorBody({ testOverlaysHidden }: EditorBodyProps) {
  const { t } = useLingui()
  const [roomViewHasFocus, setRoomViewHasFocus] = useState(false)
  const sceneIsAtDefaults = useSceneIsAtDefaults()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const startupLoadingActive = useStartupLoadingActive()
  const startupOverlayActive = useStartupOverlayActive()
  const assetError = useAssetError()
  const selectedFurniture = useSelectedFurniture()
  const { roomViewRef } = useEditorRefs()
  const dispatch = useCommandDispatch()
  const roomViewFocusRequest = useRoomViewFocusRequest()
  const roomViewFocusFrameRef = useRef<number | null>(null)

  const focusRoomView = useCallback(() => {
    if (roomViewFocusFrameRef.current !== null) {
      cancelAnimationFrame(roomViewFocusFrameRef.current)
    }

    roomViewFocusFrameRef.current = requestAnimationFrame(() => {
      roomViewFocusFrameRef.current = null
      roomViewRef.current?.focus()
    })
  }, [roomViewRef])

  useEffect(() => {
    return () => {
      if (roomViewFocusFrameRef.current !== null) {
        cancelAnimationFrame(roomViewFocusFrameRef.current)
      }
    }
  }, [])

  // Warm the chrome chunk during loading so it is cached by the time the editor
  // unlocks. Kept off the index.html modulepreload list deliberately, so it does
  // not contend at high priority with the furniture downloads the user waits on.
  useEffect(() => {
    importEditorChrome().catch(() => {
      // Swallowed: the warm is best-effort; the mounting path reports a
      // failed chunk fetch through the startup error.
    })
  }, [])

  // Consume room-view focus-intent requests (e.g. post-delete) from external
  // coordinators; EditorBody owns the room-view element.
  useEffect(() => {
    if (roomViewFocusRequest === null) {
      return
    }

    focusRoomView()
    selectionActions.clearRoomViewFocusRequest()
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

  const handleCanvasPointerMissed = useCallback(() => {
    focusRoomView()
    clearCanvasSelection()
  }, [focusRoomView])

  return (
    <main
      className="relative size-full"
      aria-busy={startupLoadingActive}
      data-test-overlays-hidden={testOverlaysHidden ? 'true' : 'false'}
    >
      <h1 className="sr-only">{APP_NAME}</h1>
      <section
        aria-describedby="scene-instructions"
        aria-label={t`Interactive 3D room editor`}
        ref={roomViewRef}
        tabIndex={0}
        inert={startupOverlayActive}
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
        <p id="scene-instructions" className="sr-only">
          <Trans>
            Use the arrow keys to browse items in the room, then press Enter or
            Space to select one.
          </Trans>
        </p>
        <Suspense fallback={null}>
          <SceneCanvas onPointerMissed={handleCanvasPointerMissed} />
        </Suspense>
      </section>

      {editorInteractionsEnabled && !testOverlaysHidden ? (
        <Suspense fallback={null}>
          <EditorOverlay />
        </Suspense>
      ) : null}
      <InitializationProgress />
      {assetError ? (
        <InitializationError
          errorKind={assetError.kind}
          errorMessage={assetError.message}
        />
      ) : null}
      <Announcer />
      {/* Sonner's toast region label defaults to hardcoded English. */}
      <Toaster containerAriaLabel={t`Notifications`} />
    </main>
  )
}
