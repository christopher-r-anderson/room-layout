import { useEffect, useMemo, useRef } from 'react'
import { useProgress } from '@react-three/drei'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'

function formatAssetLabel(item: string) {
  if (!item) {
    return 'Preparing furniture assets...'
  }

  const normalizedItem = item.split('?')[0]
  const filename = normalizedItem.split('/').pop()

  return filename ?? normalizedItem
}

export function InitializationProgress({ visible }: { visible: boolean }) {
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
    <section
      className="absolute inset-0 grid place-items-center bg-background/75 p-6 max-[720px]:p-4"
      aria-live="polite"
    >
      <Card
        ref={panelRef}
        className="w-[min(26.25rem,calc(100vw-2rem))] gap-3 shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="startup-loading-title"
        aria-describedby="startup-loading-description startup-loading-progress-label"
        tabIndex={-1}
      >
        <CardContent className="grid gap-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Loading scene assets
          </p>
          <h2
            id="startup-loading-title"
            className="text-2xl font-semibold leading-tight max-[720px]:text-[1.375rem]"
          >
            Preparing the room editor
          </h2>
          <p
            id="startup-loading-description"
            className="text-sm leading-relaxed text-foreground"
          >
            The editor will unlock after the required furniture models finish
            loading.
          </p>
          <Progress
            value={roundedProgress}
            aria-label="Furniture asset loading progress"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={roundedProgress}
          />
          <div className="flex items-baseline justify-between gap-3 text-sm text-foreground max-[720px]:flex-col max-[720px]:items-start">
            <strong>{String(roundedProgress)}%</strong>
            <span>
              {active && total > 0
                ? `Asset ${String(Math.min(loaded + 1, total))} of ${String(total)}`
                : 'Starting asset requests'}
            </span>
          </div>
          <p
            id="startup-loading-progress-label"
            className="text-sm leading-relaxed text-foreground"
          >
            Current item: {formatAssetLabel(item)}
          </p>
        </CardContent>
      </Card>
    </section>
  )
}
