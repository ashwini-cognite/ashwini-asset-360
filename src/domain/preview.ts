const IMAGE_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/gif', 'image/webp']);

export type PreviewKind = 'pdf' | 'image' | 'external';

export function previewKind(mimeType: string): PreviewKind {
  const normalized = mimeType.trim().toLowerCase();
  if (normalized === 'application/pdf') return 'pdf';
  if (IMAGE_MIME_TYPES.has(normalized)) return 'image';
  return 'external';
}
