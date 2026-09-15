export function resolvePublicAssetPath(assetPath: string) {
  const normalizedBasePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`
  const normalizedAssetPath = assetPath.startsWith('/')
    ? assetPath.slice(1)
    : assetPath

  return `${normalizedBasePath}${normalizedAssetPath}`
}
