// The API stores image paths relative to its origin ("/uploads/recipes/x.png").
export function resolveImageUrl(path: string | null | undefined, baseUrl: string): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path;
  return `${baseUrl.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
