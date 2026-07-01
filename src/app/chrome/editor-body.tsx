import { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react'
import { flushSync } from 'react-dom'
import { Trans, useLingui } from '@lingui/react/macro'
import { useIsBlockingOverlayOpen } from '@/core/stores/dialog-store'
import { useSelectedFurniture } from '@/core/stores/scene-document-store'
import {
  selectionFocusActions,
  useRoomViewFocusRequest,
} from '@/core/stores/selection-focus-store'
import { usePreviewedId } from '@/core/operations/previewed-id'
import { useActiveFinishIds } from '@/core/operations/active-finish-ids'
import { useSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import {
  useEditorInteractionsEnabled,
  useSceneEpoch,
  useStartupLoadingActive,
  useStartupOverlayActive,
} from '@/core/stores/editor-lifecycle-store'
import { useCatalogEntries, useCollections } from '@/core/stores/assets-store'
import { useKeyboardShortcuts } from '@/features/keyboard/use-keyboard-shortcuts'
import { useCameraKeyState } from '@/features/keyboard/use-camera-key-state'
import { useCommandDispatch } from '@/core/commands/command-dispatch-context'
import { clearCanvasSelection } from '@/core/operations/selection-actions'
import { APP_NAME } from '@/shared/messages/app-identity'
import { useEditorRefs } from '@/shared/providers/editor-refs-context'
import { Announcer } from './feedback/announcer'
import { Toaster } from '@/shared/ui/sonner'
import { EditorOverlay } from './editor-overlay'

// The 3D engine (three/r3f/drei) lives in this lazily-imported chunk so it
// downloads in parallel with — and never blocks — the initial shell paint.
const SceneCanvas = lazy(() => import('./scene-canvas'))

export interface EditorBodyProps {
  testOverlaysHidden: boolean
}

export function EditorBody({ testOverlaysHidden }: EditorBodyProps) {
  const { t } = useLingui()
  const previewedId = usePreviewedId()
  const {
    selectedFloorOption,
    selectedWallOption,
    selectedLightingMoodOption,
  } = useActiveFinishIds()
  const [roomViewHasFocus, setRoomViewHasFocus] = useState(false)
  const catalog = useCatalogEntries()
  const collections = useCollections()
  const sceneEpoch = useSceneEpoch()
  const sceneIsAtDefaults = useSceneIsAtDefaults()
  const editorInteractionsEnabled = useEditorInteractionsEnabled()
  const isBlockingOverlayOpen = useIsBlockingOverlayOpen()
  const startupLoadingActive = useStartupLoadingActive()
  const startupOverlayActive = useStartupOverlayActive()
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

  // Consume room-view focus-intent requests (e.g. post-delete) from external
  // coordinators; EditorBody owns the room-view element.
  useEffect(() => {
    if (roomViewFocusRequest === null) {
      return
    }

    focusRoomView()
    selectionFocusActions.clearRoomViewFocusRequest()
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
          <SceneCanvas
            sceneEpoch={sceneEpoch}
            onPointerMissed={handleCanvasPointerMissed}
            catalog={catalog}
            collections={collections}
            previewedId={previewedId}
            selectedFloorOption={selectedFloorOption}
            selectedWallOption={selectedWallOption}
            selectedLightingMoodOption={selectedLightingMoodOption}
          />
        </Suspense>
      </section>

      {testOverlaysHidden ? null : <EditorOverlay />}
      <Announcer />
      {/* Sonner's toast region label defaults to hardcoded English. */}
      <Toaster containerAriaLabel={t`Notifications`} />
    </main>
  )
}
