export function createDevPerfLogger(prefix: string) {
  if (!import.meta.env.DEV) {
    return () => {
      // no-op outside development builds
    }
  }

  return (message: string, data?: unknown) => {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[${timestamp}] ${prefix} ${message}`, data ?? '')
  }
}
