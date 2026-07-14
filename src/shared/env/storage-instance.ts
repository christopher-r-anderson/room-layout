// The storage instance segment namespaces every localStorage key so
// deployments sharing an origin cannot clobber each other's drafts and
// preferences. It must resolve synchronously: the locale preference is read
// from storage before first render (docs/architecture/configuration.md).

// Returns the instance segment, or '' when none applies (root-path deploys and
// dev servers), which keeps their keys unsegmented.
export function deriveStorageInstance(input: {
  explicit: string | undefined
  basePath: string
}): string {
  const explicit = input.explicit?.trim()
  if (explicit) {
    return explicit
  }

  return input.basePath.replace(/^\/+/, '').replace(/\/+$/, '')
}

export const STORAGE_INSTANCE = deriveStorageInstance({
  explicit: import.meta.env.VITE_STORAGE_INSTANCE as string | undefined,
  basePath: import.meta.env.BASE_URL,
})
