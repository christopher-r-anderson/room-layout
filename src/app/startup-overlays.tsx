import { useProgress } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'

function formatAssetLabel(item: string) {
  if (!item) {
    return 'Preparing furniture assets...'
  }

  const normalizedItem = item.split('?')[0]
  const filename = normalizedItem.split('/').pop()

  return filename ?? normalizedItem
}

export function StartupLoadingOverlay({ visible }: { visible: boolean }) {
  const { active, item, loaded, progress, total } = useProgress()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const roundedProgress = useMemo(() => {
    if (Number.isNaN(progress)) {
      return 0
    }

    return Math.max(0, Math.min(100, Math.round(progress)))
  }, [progress])

  useEffect(() => {
    if (!visible) {
      return
    }

    panelRef.current?.focus()
  }, [visible])

  if (!visible) {
    return null
  }

  return (
    <section className="startup-overlay" aria-live="polite">
      <div
        ref={panelRef}
        className="startup-overlay-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="startup-loading-title"
        aria-describedby="startup-loading-description startup-loading-progress-label"
        tabIndex={-1}
      >
        <p className="startup-overlay-eyebrow">Loading scene assets</p>
        <h2 id="startup-loading-title" className="startup-overlay-title">
          Preparing the room editor
        </h2>
        <p id="startup-loading-description" className="startup-overlay-copy">
          The editor will unlock after the required furniture models finish
          loading.
        </p>
        <div
          className="startup-progress"
          role="progressbar"
          aria-label="Furniture asset loading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={roundedProgress}
        >
          <div
            className="startup-progress-bar"
            style={{ width: `${String(roundedProgress)}%` }}
          />
        </div>
        <div className="startup-progress-summary">
          <strong>{String(roundedProgress)}%</strong>
          <span>
            {active && total > 0
              ? `Asset ${String(Math.min(loaded + 1, total))} of ${String(total)}`
              : 'Starting asset requests'}
          </span>
        </div>
        <p
          id="startup-loading-progress-label"
          className="startup-progress-label"
        >
          Current item: {formatAssetLabel(item)}
        </p>
      </div>
    </section>
  )
}

export function StartupErrorOverlay({ onRetry }: { onRetry: () => void }) {
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    retryButtonRef.current?.focus()
  }, [])

  return (
    <section className="startup-overlay" aria-live="assertive">
      <div
        className="startup-overlay-panel startup-overlay-panel-error"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="startup-error-title"
        aria-describedby="startup-error-description startup-error-note"
      >
        <p className="startup-overlay-eyebrow">Asset loading failed</p>
        <h2 id="startup-error-title" className="startup-overlay-title">
          The room editor could not start
        </h2>
        <p id="startup-error-description" className="startup-overlay-copy">
          A required furniture model did not load correctly, so editor
          interactions are temporarily unavailable.
        </p>
        <p id="startup-error-note" className="startup-overlay-note">
          Retry to request the essential assets again.
        </p>
        <div className="startup-overlay-actions">
          <button
            ref={retryButtonRef}
            type="button"
            className="history-button"
            onClick={onRetry}
          >
            Retry Loading
          </button>
        </div>
      </div>
    </section>
  )
}
