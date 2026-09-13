/** Prefix site basePath for local static assets (GitHub Pages project sites). */
export function withBasePath(path: string): string {
  if (!path || /^https?:\/\//i.test(path) || path.startsWith('data:')) {
    return path;
  }
  const base = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
  if (!path.startsWith('/')) return path;
  if (base && (path === base || path.startsWith(`${base}/`))) return path;
  return `${base}${path}`;
}
