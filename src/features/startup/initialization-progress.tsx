import { useLingui } from '@lingui/react/macro'
import { useFurnitureAssetPrefetchProgress } from '@/core/operations/furniture-asset-prefetch'
import { useStartupLoadingActive } from '@/core/stores/editor-lifecycle-store'
import { formatPercent } from '@/shared/i18n/formatters'
import { APP_NAME } from '@/shared/messages/app-identity'
import { Progress } from '@/shared/ui/progress'

// Minimal startup loader. It shares the opaque, theme-matched full-screen
// treatment of the pre-paint spinner in index.html so the hand-off from that
// spinner to this React screen is seamless rather than a jump into an app-shell
// panel. It keeps a progress readout (bar + percent) but drops the card, heading,
// body copy, and per-asset filenames, which read as a professional tool rather
// than a consumer loading screen. The column (spinner, brand, bar, status row)
// mirrors the index.html skeleton element-for-element so the spinner does not
// shift when React replaces the skeleton.
export function InitializationProgress() {
  const { t } = useLingui()
  const visible = useStartupLoadingActive()
  const { loadedCount, percent, total } = useFurnitureAssetPrefetchProgress()
  const roundedProgress = Math.round(percent)

  // Before the manifest resolves there is nothing to count yet (preparing); once
  // every file's bytes are in, the engine is seeding/parsing them (finalizing).
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
    <section
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
    </section>
  )
}
