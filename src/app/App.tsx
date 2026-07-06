import { useEffect, useState } from 'react'
import { startEditorReconcilers } from '@/core/operations/editor-reconcilers'
import { useStartupBootstrap } from '@/features/startup/use-startup-bootstrap'
import { useStartupReadiness } from '@/features/startup/use-startup-readiness'
import { EditorBody } from './chrome/editor-body'
import { EditorProviders } from './chrome/providers/editor-providers'
import { perfCounters } from '@/shared/debug/perf-counters'
import { IS_E2E_BUILD } from '@/shared/env/e2e'
import { useTestStateBridge } from './testing/use-test-state-bridge'
import { bootstrapDialogRegistry } from './dialogs/bootstrap-dialog-registry'

function App() {
  if (import.meta.env.DEV || IS_E2E_BUILD) {
    perfCounters.incrAppRender()
  }
  const [testOverlaysHidden, setTestOverlaysHidden] = useState(false)

  useStartupBootstrap()
  useStartupReadiness()

  useEffect(() => {
    bootstrapDialogRegistry()
  }, [])

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
