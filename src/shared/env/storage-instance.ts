// The storage instance segment namespaces every localStorage key so
// deployments sharing an origin cannot clobber each other's drafts and
// preferences. An explicit VITE_STORAGE_INSTANCE wins; otherwise the segment
// derives from the build's base path, which already distinguishes same-origin
// deployments. The value must resolve synchronously: the locale preference is
// read from storage before first render (docs/architecture/configuration.md).

const MAX_INSTANCE_LENGTH = 64

function sanitizeInstanceSegment(value: string): string {
  return value
    .toLowerCase()
    .replaceAll(/[^a-z0-9._-]+/g, '-')
    .replaceAll(/-{2,}/g, '-')
    .slice(0, MAX_INSTANCE_LENGTH)
    .replaceAll(/^-+|-+$/g, '')
}

// Returns the instance segment, or '' when none applies (root-path deploys and
// dev servers), which keeps their keys unsegmented.
export function deriveStorageInstance(input: {
  explicit: string | undefined
  basePath: string
}): string {
  if (input.explicit !== undefined) {
    const explicit = sanitizeInstanceSegment(input.explicit)
    if (explicit.length > 0) {
      return explicit
    }
  }

  return sanitizeInstanceSegment(input.basePath.replaceAll('/', '-'))
}

export const STORAGE_INSTANCE = deriveStorageInstance({
  explicit: import.meta.env.VITE_STORAGE_INSTANCE as string | undefined,
  basePath: import.meta.env.BASE_URL,
})
