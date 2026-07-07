import { useLingui } from '@lingui/react/macro'
import { useGatedLoadProgress } from '@/core/stores/collection-loading-store'
import { useStartupLoadingActive } from '@/core/stores/editor-lifecycle-store'
import { formatPercent } from '@/shared/i18n/formatters'
import { APP_NAME } from '@/shared/messages/app-identity'
import { Progress } from '@/shared/ui/progress'

// Minimal startup loader. Its column (spinner, brand, bar, status row) mirrors the
// index.html pre-paint skeleton element-for-element, with the same opaque
// theme-matched treatment, so the hand-off when React replaces the skeleton does
// not shift or flash.
export function InitializationProgress() {
  const { t } = useLingui()
  const visible = useStartupLoadingActive()
  const { loadedCount, percent, total } = useGatedLoadProgress()
  const roundedProgress = Math.round(percent)

  // Before the manifest resolves there is nothing to count yet (preparing); once
  // every file's bytes are in, the engine is parsing them (finalizing).
  const stage =
    total === 0
      ? 'preparing'
      : loadedCount < total
        ? 'downloading'
        : 'finalizing'
  const statusText =
    stage === 'downloading'
      ? t`Loading furniture`
      : stage === 'finalizing'
        ? t`Almost ready`
        : t`Getting things ready`

  if (!visible) {
    return null
  }

  return (
    <div
      className="absolute inset-0 grid place-items-center bg-background p-6"
      role="status"
      aria-live="polite"
      aria-label={t`Loading the room`}
    >
      <div className="grid w-[min(18rem,calc(100vw-3rem))] justify-items-center gap-4">
        {/* Matches the pre-paint spinner in index.html (size, weight, tint, speed)
            so the two loaders read as one continuous screen. */}
        <span
          aria-hidden="true"
          className="size-10 animate-spin rounded-full border-[3px] border-black/10 border-t-black/45 [animation-duration:0.8s] motion-reduce:[animation-duration:2s] dark:border-white/12 dark:border-t-white/55"
        />
        <div className="text-sm font-medium leading-5 text-foreground">
          {APP_NAME}
        </div>
        <Progress
          className="w-full"
          value={roundedProgress}
          aria-label={t`Room loading progress`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={roundedProgress}
        />
        <p className="flex w-full items-baseline justify-between gap-2 text-sm leading-5 text-muted-foreground">
          <span className="font-medium tabular-nums text-foreground">
            {formatPercent(roundedProgress / 100)}
          </span>
          <span>{statusText}</span>
        </p>
      </div>
    </div>
  )
}
