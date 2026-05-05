import { useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export function InitializationError({ onRetry }: { onRetry: () => void }) {
  const retryButtonRef = useRef<HTMLButtonElement | null>(null)

  useEffect(() => {
    retryButtonRef.current?.focus()
  }, [])

  return (
    <section
      className="absolute inset-0 grid place-items-center bg-background/75 p-6 max-[720px]:p-4"
      aria-live="assertive"
    >
      <Card
        className="w-[min(26.25rem,calc(100vw-2rem))] gap-3 border-destructive/25 shadow-xl"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="startup-error-title"
        aria-describedby="startup-error-description startup-error-note"
      >
        <CardContent className="grid gap-3 p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.04em] text-muted-foreground">
            Asset loading failed
          </p>
          <h2
            id="startup-error-title"
            className="text-2xl font-semibold leading-tight"
          >
            The room editor could not start
          </h2>
          <p
            id="startup-error-description"
            className="text-sm leading-relaxed text-foreground"
          >
            A required furniture model did not load correctly, so editor
            interactions are temporarily unavailable.
          </p>
          <p
            id="startup-error-note"
            className="text-sm leading-relaxed text-destructive"
          >
            Retry to request the essential assets again.
          </p>
          <div className="flex justify-start">
            <Button
              ref={retryButtonRef}
              type="button"
              variant="outline"
              onClick={onRetry}
            >
              Retry Loading
            </Button>
          </div>
        </CardContent>
      </Card>
    </section>
  )
}
