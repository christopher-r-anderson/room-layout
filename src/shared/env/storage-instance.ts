// The storage instance segment namespaces every localStorage key so
// deployments sharing an origin cannot clobber each other's drafts and
// preferences. An explicit VITE_STORAGE_INSTANCE wins; otherwise the segment
// derives from the build's base path, which already distinguishes same-origin
// deployments. The value must resolve synchronously: the locale preference is
// read from storage before first render (docs/architecture/configuration.md).

const MAX_INSTANCE_LENGTH = 64

function sanitizeChars(value: string, disallowed: RegExp): string {
  return value
    .toLowerCase()
    .replaceAll(disallowed, '-')
    .replaceAll(/-{2,}/g, '-')
    .replaceAll(/^-+|-+$/g, '')
}

function sanitizeExplicitInstance(value: string): string {
  return sanitizeChars(value, /[^a-z0-9._-]+/g)
}

// Excludes '.' so that in a derived instance a dot always marks a path
// boundary: /a.b/ and /a/b/ stay distinct.
function sanitizePathSegment(value: string): string {
  return sanitizeChars(value, /[^a-z0-9_-]+/g)
}

function capInstanceLength(value: string): string {
  return value.slice(0, MAX_INSTANCE_LENGTH).replace(/[.-]+$/, '')
}

// Returns the instance segment, or '' when none applies (root-path deploys and
// dev servers), which keeps their keys unsegmented.
export function deriveStorageInstance(input: {
  explicit: string | undefined
  basePath: string
}): string {
  if (input.explicit !== undefined) {
    const explicit = capInstanceLength(sanitizeExplicitInstance(input.explicit))
    if (explicit.length > 0) {
      return explicit
    }
  }

  // Path separators map to '.' while sanitization noise maps to '-', so
  // /shop/planner/ and /shop-planner/ derive distinct instances.
  const derived = input.basePath
    .split('/')
    .map(sanitizePathSegment)
    .filter((segment) => segment.length > 0)
    .join('.')
  return capInstanceLength(derived)
}

export const STORAGE_INSTANCE = deriveStorageInstance({
  explicit: import.meta.env.VITE_STORAGE_INSTANCE as string | undefined,
  basePath: import.meta.env.BASE_URL,
})
