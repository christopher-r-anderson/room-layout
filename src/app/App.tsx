import { useEffect, useMemo, useState } from 'react'
import { getSceneIsAtDefaults } from '@/core/operations/use-scene-is-at-defaults'
import { startEditorReconcilers } from '@/core/operations/editor-reconcilers'
import { useEnvironmentConfig } from '@/core/stores/assets-store'
import { useStartupBootstrap } from '@/features/startup/use-startup-bootstrap'
import { EditorBody } from './chrome/editor-body'
import { EditorProviders } from './chrome/providers/editor-providers'
import { perfCounters } from '@/shared/debug/perf-counters'
import { IS_E2E_BUILD } from '@/shared/env/e2e'
import { useDraftPersistence } from '@/features/url-scene/use-draft-persistence'
import { useTestStateBridge } from './testing/use-test-state-bridge'
import {
  buildDialogRuntimeContext,
  bootstrapDialogRegistry,
} from './dialogs/bootstrap-dialog-registry'

function App() {
  if (import.meta.env.DEV || IS_E2E_BUILD) {
    perfCounters.incrAppRender()
  }
  const [testOverlaysHidden, setTestOverlaysHidden] = useState(false)

  useStartupBootstrap()
  const environmentConfig = useEnvironmentConfig()

  useDraftPersistence({
    environmentConfig,
  })

  const dialogRuntimeContext = useMemo(
    () =>
      buildDialogRuntimeContext({
        canStartOver: () => !getSceneIsAtDefaults(),
      }),
    [],
  )
  useEffect(() => {
    bootstrapDialogRegistry(dialogRuntimeContext)
  }, [dialogRuntimeContext])

  useEffect(() => startEditorReconcilers(), [])

  useTestStateBridge({
    setTestOverlaysHidden,
  })

  return (
    <EditorProviders>
      <EditorBody testOverlaysHidden={testOverlaysHidden} />
    </EditorProviders>
  )
}

export default App
