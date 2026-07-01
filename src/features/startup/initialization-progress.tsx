import { useEffect, useRef } from 'react'
import { Trans, useLingui } from '@lingui/react/macro'
import { useFurnitureAssetPrefetchProgress } from '@/core/operations/furniture-asset-prefetch'
import { useStartupLoadingActive } from '@/core/stores/editor-lifecycle-store'
import { formatPercent } from '@/shared/i18n/formatters'
import { Caption } from '@/shared/ui/caption'
import { Card, CardContent } from '@/shared/ui/card'
import { Progress } from '@/shared/ui/progress'

// Reduces an asset URL to its filename; asset filenames are not translatable.
function formatAssetFilename(item: string) {
  const normalizedItem = item.split('?')[0]
  const filename = normalizedItem.split('/').pop()

  return filename ?? normalizedItem
}

export function InitializationProgress() {
  const { t } = useLingui()
  const visible = useStartupLoadingActive()
  const { currentItem, loadedCount, percent, total } =
    useFurnitureAssetPrefetchProgress()
  const panelRef = useRef<HTMLDivElement | null>(null)
  const roundedProgress = Math.round(percent)

  // Before the manifest resolves there is nothing to count yet (preparing); once
  // every file's bytes are in, the engine is seeding/parsing them (finalizing).
  // Distinguishing these from the active download keeps the panel from reading
  // "Starting asset requests" at 100%.
  const stage =
    total === 0
      ? 'preparing'
      : loadedCount < total
        ? 'downloading'
        : 'finalizing'

  const assetNumber = Math.min(loadedCount + 1, total)
  const statusText =
    stage === 'downloading'
      ? t`Asset ${assetNumber} of ${total}`
      : stage === 'finalizing'
        ? t`Preparing the editor`
        : t`Starting asset requests`

  const currentAsset = currentItem
    ? formatAssetFilename(currentItem)
    : t`Preparing furniture assets...`
  const detailText =
    stage === 'downloading'
      ? t`Current item: ${currentAsset}`
      : stage === 'finalizing'
        ? t`Finishing up the room view`
        : t`Fetching the furniture catalog`

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
    <section
      className="absolute inset-0 grid place-items-center bg-background/75 p-6 max-[720px]:p-4"
      aria-live="polite"
    >
      <Card
        ref={panelRef}
        className="w-[min(26.25rem,calc(100vw-2rem))] gap-3"
        role="region"
        aria-labelledby="startup-loading-title"
        aria-describedby="startup-loading-description startup-loading-progress-label"
        tabIndex={-1}
      >
        <CardContent className="grid gap-3 p-5">
          <Caption>
            <Trans>Loading scene assets</Trans>
          </Caption>
          <h2
            id="startup-loading-title"
            className="text-2xl font-semibold leading-tight max-[720px]:text-[1.375rem]"
          >
            <Trans>Preparing the room editor</Trans>
          </h2>
          <p
            id="startup-loading-description"
            className="text-sm leading-relaxed text-foreground"
          >
            <Trans>
              The editor will unlock after the required furniture models finish
              loading.
            </Trans>
          </p>
          <Progress
            value={roundedProgress}
            aria-label={t`Furniture asset loading progress`}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={roundedProgress}
          />
          <div className="flex items-baseline justify-between gap-3 text-sm text-foreground max-[720px]:flex-col max-[720px]:items-start">
            <strong>{formatPercent(roundedProgress / 100)}</strong>
            <span>{statusText}</span>
          </div>
          <p
            id="startup-loading-progress-label"
            className="text-sm leading-relaxed text-foreground"
          >
            {detailText}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
