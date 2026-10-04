// The one place the upload limit lives. Imported by both browser code (to
// reject a file instantly, before wasting minutes uploading it) and server
// code (the authoritative check) — so keep this free of 'use server' and
// any server-only imports.
//
// If you change MAX_UPLOAD_MB, also raise the matching limits in
// next.config.ts (serverActions.bodySizeLimit + proxyClientMaxBodySize,
// both set a little above this to leave room for form fields) and the
// nginx client_max_body_size on the server.

export const MAX_UPLOAD_MB = 300
export const MAX_UPLOAD_BYTES = MAX_UPLOAD_MB * 1024 * 1024

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

/**
 * Returns a ready-to-show error message if `bytes` is over the limit,
 * otherwise null. `what` names the thing being uploaded ("Image",
 * "Backup file", ...) so the message reads naturally.
 */
export function uploadSizeError(bytes: number, what: string = 'File'): string | null {
  if (bytes <= MAX_UPLOAD_BYTES) return null
  return `${what} is too large (${formatFileSize(bytes)}). The maximum allowed size is ${MAX_UPLOAD_MB} MB.`
}
