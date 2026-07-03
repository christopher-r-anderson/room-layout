export function createDevPerfLogger(prefix: string) {
  if (!import.meta.env.DEV || import.meta.env.MODE === 'test') {
    return () => {
      // no-op outside the dev server (production builds and test runs)
    }
  }

  return (message: string, data?: unknown) => {
    const timestamp = new Date().toLocaleTimeString()
    console.log(`[${timestamp}] ${prefix} ${message}`, data ?? '')
  }
}
