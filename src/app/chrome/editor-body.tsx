import { Suspense, lazy, useCallback, useEffect, useRef } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useIsBlockingOverlayOpen } from '@/core/stores/dialog-store'
import { useSelectedFurniture } from '@/core/operations/selected-furniture'
import {
  focusActions,
  getPendingFocus,
  usePendingFocus,
} from '@/core/stores/focus-store'
import { isFocusLeaving } from '@/shared/lib/focus'
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
import { useEditorRectRegistry } from '@/core/layout/editor-rects-context'
import { Announcer } from './announcer'
import { withStartupChunkRetry } from './startup-chunk-retry'
import { AppToaster } from '@/shared/ui/toast'
import { appToastManager } from '@/core/stores/feedback-store'

// The 3D engine (three/r3f/drei) lives in this lazily-imported chunk so it
// downloads in parallel with — and never blocks — the initial shell paint.
const SceneCanvas = lazy(withStartupChunkRetry(() => import('./scene-canvas')))

// The editor chrome is code-split into its own chunk and mounts only once the
// editor is ready, so it stays out of the initial shell (which keeps just the
// loading/error UI and the canvas boundary). Header chrome and editor panels
// mount separately (banner vs main landmark) but share the one chunk.
const importEditorChrome = () => import('./editor-overlay')
const EditorHeader = lazy(
  withStartupChunkRetry(() =>
    importEditorChrome().then((module) => ({ default: module.EditorHeader })),
  ),
)
const EditorPanels = lazy(
  withStartupChunkRetry(() =>
    importEditorChrome().then((module) => ({ default: module.EditorPanels })),
  ),
)

export interface EditorBodyProps {
  testOverlaysHidden: boolean
}

export function EditorBody({ testOverlaysHidden }: EditorBodyProps) {
  const { t } = useLingui()
  const sceneIsAtDefaults = useSceneIsAtDefaults()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const startupLoadingActive = useStartupLoadingActive()
  const startupOverlayActive = useStartupOverlayActive()
  const assetError = useAssetError()
  const selectedFurniture = useSelectedFurniture()
  const roomViewRef = useRef<HTMLElement | null>(null)
  const registerRoomViewRect = useEditorRectRegistry()('room-view')
  // Stable so React only detaches on real unmount, not per render.
  const sectionRef = useCallback(
    (node: HTMLElement | null) => {
      roomViewRef.current = node
      registerRoomViewRect(node)
    },
    [registerRoomViewRect],
  )
  const dispatch = useCommandDispatch()
  const pendingFocus = usePendingFocus()
  const sceneFocusDirective =
    pendingFocus?.surface === 'scene' ? pendingFocus : null
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

  // Realizes scene focus directives (e.g. post-delete); EditorBody owns the
  // room-view element. The focus is deferred one frame so it outlives a
  // closing dialog's own focus restore, which means realization must be
  // confirmed inside the frame: a newer directive cancels the frame via the
  // cleanup, and the pending check catches a store write racing the rAF.
  useEffect(() => {
    if (!sceneFocusDirective) {
      return
    }

    const frame = requestAnimationFrame(() => {
      if (getPendingFocus() !== sceneFocusDirective) {
        return
      }

      roomViewRef.current?.focus()
      focusActions.directiveRealized(sceneFocusDirective)
    })

    return () => {
      cancelAnimationFrame(frame)
    }
  }, [sceneFocusDirective, roomViewRef])

  useKeyboardShortcuts({
    enabled: editorInteractionsEnabled,
    hasSelection: selectedFurniture !== null,
    isBlockingOverlayOpen,
    canStartOver: !sceneIsAtDefaults,
    dispatch,
  })

  useCameraKeyState({
    enabled: editorInteractionsEnabled,
    isBlockingOverlayOpen,
  })

  const handleCanvasPointerMissed = useCallback(() => {
    focusRoomView()
    clearCanvasSelection()
  }, [focusRoomView])

  const chromeMounted = editorInteractionsEnabled && !testOverlaysHidden

  // The shell column owns the chrome flow: the header and the panels inside
  // <main> are flex siblings, so a header that wraps (narrow viewports, longer
  // locales) pushes the panel column down naturally. The canvas and startup
  // overlays are position:fixed, so they stay viewport-filling from inside
  // <main>. <main> itself must stay unpositioned: the floating selected-item
  // toolbar resolves its absolute position against this fixed column.
  return (
    <div className="pointer-events-none fixed inset-2 flex flex-col gap-2">
      {/* z-10: the header precedes the z-0 canvas in DOM paint order. */}
      <header className="z-10">
        <h1 className="sr-only">{APP_NAME}</h1>
        {chromeMounted ? (
          <Suspense fallback={null}>
            <EditorHeader />
          </Suspense>
        ) : null}
      </header>
      <main
        className="flex min-h-0 flex-1 flex-col justify-between gap-2"
        aria-busy={startupLoadingActive}
        data-test-overlays-hidden={testOverlaysHidden ? 'true' : 'false'}
      >
        <section
          aria-describedby="scene-instructions"
          aria-label={t`Interactive 3D room editor`}
          ref={sectionRef}
          tabIndex={0}
          inert={startupOverlayActive}
          className="pointer-events-auto fixed inset-0 z-0 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          onFocus={() => {
            focusActions.surfaceFocused('scene')
          }}
          onBlur={(event) => {
            if (isFocusLeaving(event)) {
              focusActions.surfaceBlurred('scene')
            }
          }}
          onPointerDownCapture={focusRoomView}
        >
          <p id="scene-instructions" className="sr-only">
            {selectedFurniture ? (
              <Trans>
                Use the arrow keys to move the selected item, or press comma or
                period to rotate it.
              </Trans>
            ) : (
              <Trans>
                Use the arrow keys to browse items in the room, then press Enter
                or Space to select one.
              </Trans>
            )}
          </p>
          <Suspense fallback={null}>
            <SceneCanvas onPointerMissed={handleCanvasPointerMissed} />
          </Suspense>
        </section>

        {chromeMounted ? (
          <Suspense fallback={null}>
            <EditorPanels />
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
        <AppToaster toastManager={appToastManager} />
      </main>
    </div>
  )
}
