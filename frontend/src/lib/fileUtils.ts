export const ACCEPTED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png'
];

export const ACCEPTED_EXTENSIONS = [
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png'
];

export const MAX_FILE_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

/**
 * Derives a clean display name from a file name.
 * e.g., 'blood_test_september.pdf' -> 'Blood Test September'
 */
export function deriveDisplayName(filename: string): string {
  // Remove extension
  let name = filename;
  const lastDot = name.lastIndexOf('.');
  if (lastDot !== -1) {
    name = name.substring(0, lastDot);
  }

  // Replace underscores and hyphens with spaces
  name = name.replace(/[_-]/g, ' ');

  // Title case
  return name.replace(
    /\w\S*/g,
    (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
  ).trim();
}

/**
 * Validates a document file against accepted types, extensions, and size.
 */
export function validateDocumentFile(file: File): { valid: boolean; error?: string } {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  if (file.size === 0) {
    return { valid: false, error: 'File is empty.' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { valid: false, error: `File exceeds maximum allowed size of ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.` };
  }

  // Check MIME type first, if available
  if (file.type && !ACCEPTED_MIME_TYPES.includes(file.type)) {
    return { valid: false, error: 'Only PDF, JPG, JPEG, and PNG files are supported.' };
  }

  // Fallback to extension check if MIME type is missing or to enforce extension along with MIME
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  if (!ACCEPTED_EXTENSIONS.includes(extension)) {
    return { valid: false, error: 'Only PDF, JPG, JPEG, and PNG files are supported.' };
  }

  return { valid: true };
}

/**
 * Returns a normalized MIME type for the file.
 */
export function getDocumentMimeType(file: File): string {
  if (file.type) {
    return file.type;
  }
  
  const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
  switch (extension) {
    case '.pdf': return 'application/pdf';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    default: return 'application/octet-stream';
  }
}
