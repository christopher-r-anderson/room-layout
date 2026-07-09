import { Toast } from '@base-ui/react/toast'
import { Trans, useLingui } from '@lingui/react/macro'
import {
  IconAlertOctagon,
  IconAlertTriangle,
  IconCircleCheck,
  IconInfoCircle,
  IconX,
} from '@tabler/icons-react'

import { cn } from '@/shared/lib/utils'
import { Button } from '@/shared/ui/button'

const INTENT_ICONS: Record<string, typeof IconInfoCircle> = {
  success: IconCircleCheck,
  warning: IconAlertTriangle,
  error: IconAlertOctagon,
}

function ToastList() {
  const { toasts } = Toast.useToastManager()

  return toasts.map((toast) => {
    const Icon = INTENT_ICONS[toast.type ?? ''] ?? IconInfoCircle

    return (
      <Toast.Root
        key={toast.id}
        toast={toast}
        className={cn(
          'pointer-events-auto relative flex w-full items-start gap-2 rounded-xl bg-popover p-3 pe-10 text-xs/relaxed text-popover-foreground ring-1 ring-foreground/10 shadow-lg outline-none focus-visible:ring-2 focus-visible:ring-ring/50',
          '[translate:var(--toast-swipe-movement-x,0px)_var(--toast-swipe-movement-y,0px)]',
          'transition-[translate,opacity] duration-100 data-[swiping]:transition-none motion-reduce:transition-none',
          'data-starting-style:translate-y-2 data-starting-style:opacity-0 data-ending-style:opacity-0',
          'data-[type=error]:not-focus-visible:ring-destructive/40',
          // Base UI keeps over-limit roots as inert data-limited
          // placeholders; hide them.
          'data-limited:hidden',
        )}
      >
        <Icon
          aria-hidden="true"
          className={cn(
            'mt-0.5 size-4 shrink-0 text-muted-foreground',
            toast.type === 'success' && 'text-primary',
            toast.type === 'error' && 'text-destructive',
          )}
        />
        <div className="flex min-w-0 flex-col gap-0.5">
          <Toast.Title className="font-medium" />
          <Toast.Description className="text-muted-foreground" />
        </div>
        <Toast.Close
          render={
            <Button
              variant="ghost"
              size="icon-sm"
              className="absolute top-1.5 inset-e-1.5"
            />
          }
        >
          <IconX />
          <span className="sr-only">
            <Trans>Close notification</Trans>
          </span>
        </Toast.Close>
      </Toast.Root>
    )
  })
}

export interface AppToasterProps {
  /** The core-owned manager to subscribe to (shared/ui cannot import core). */
  toastManager: ReturnType<typeof Toast.createToastManager>
}

export function AppToaster({ toastManager }: AppToasterProps) {
  const { t } = useLingui()

  return (
    <Toast.Provider toastManager={toastManager} limit={3}>
      {/* Portal to body: inside the fixed app shell the viewport would paint
          under the body-portaled drawers/dialogs regardless of z-index. */}
      <Toast.Portal>
        {/* Modal aria-hiding spares only [aria-live] elements; this wrapper
            keeps Base UI's role=alert mirror (which has none) reachable. */}
        <div aria-live="off">
          <Toast.Viewport
            aria-label={t`Notifications`}
            className="pointer-events-none fixed bottom-4 inset-e-4 z-60 flex w-[calc(100%-2rem)] max-w-72 flex-col-reverse gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
          >
            <ToastList />
          </Toast.Viewport>
        </div>
      </Toast.Portal>
    </Toast.Provider>
  )
}
