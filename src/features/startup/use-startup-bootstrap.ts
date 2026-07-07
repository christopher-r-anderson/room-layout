import { useEffect } from 'react'
import {
  cancelStartupBootstrap,
  runStartupBootstrap,
} from '@/core/operations/startup-bootstrap'

// Mount trigger for the startup bootstrap; the fetch itself is a core
// operation (startup-bootstrap), which requestAssetRetry re-invokes directly.
export function useStartupBootstrap() {
  useEffect(() => {
    runStartupBootstrap()
    return cancelStartupBootstrap
  }, [])
}
