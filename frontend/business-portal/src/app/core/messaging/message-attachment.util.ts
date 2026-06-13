import { MessageAttachmentMetadata } from './messaging.models';

const ALLOWED_ATTACHMENT_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
  'text/plain',
]);

const MAX_ATTACHMENT_BYTES = 25 * 1024 * 1024;

export function validateMessageAttachmentFile(file: File): string | null {
  const contentType = file.type || 'application/octet-stream';
  if (!ALLOWED_ATTACHMENT_TYPES.has(contentType)) {
    return 'Unsupported file type. Use JPEG, PNG, WebP, PDF, or plain text.';
  }

  if (file.size <= 0 || file.size > MAX_ATTACHMENT_BYTES) {
    return 'File must be between 1 byte and 25 MB.';
  }

  return null;
}

export async function uploadMessageAttachment(
  file: File,
  getUploadUrl: (file: File) => Promise<{ uploadUrl: string; fileUrl: string }>,
): Promise<MessageAttachmentMetadata> {
  const validationError = validateMessageAttachmentFile(file);
  if (validationError !== null) {
    throw new Error(validationError);
  }

  const contentType = file.type || 'application/octet-stream';
  const { uploadUrl, fileUrl } = await getUploadUrl(file);

  const response = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': contentType },
  });

  if (!response.ok) {
    throw new Error('Failed to upload attachment.');
  }

  return {
    fileName: file.name,
    contentType,
    sizeBytes: file.size,
    url: fileUrl,
  };
}
