const STUB_UPLOAD_HOSTS = new Set(['localhost', '127.0.0.1']);
const STUB_UPLOAD_HOST_SUFFIX = '.clientportal.local';

const ALLOWED_LOGO_TYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/svg+xml',
]);

const MAX_LOGO_BYTES = 2 * 1024 * 1024;

function isStubUploadUrl(uploadUrl: string): boolean {
  try {
    const hostname = new URL(uploadUrl).hostname.toLowerCase();
    return STUB_UPLOAD_HOSTS.has(hostname) || hostname.endsWith(STUB_UPLOAD_HOST_SUFFIX);
  } catch {
    return false;
  }
}

export function validateLogoFile(file: File): string | null {
  const contentType = file.type || 'application/octet-stream';
  if (!ALLOWED_LOGO_TYPES.has(contentType)) {
    return 'Logo must be PNG, JPG, or SVG.';
  }

  if (file.size <= 0 || file.size > MAX_LOGO_BYTES) {
    return 'Logo must be between 1 byte and 2 MB.';
  }

  return null;
}

export async function uploadTenantLogo(
  file: File,
  getUploadUrl: (file: File) => Promise<{ uploadUrl: string; logoUrl: string }>,
): Promise<string> {
  const validationError = validateLogoFile(file);
  if (validationError !== null) {
    throw new Error(validationError);
  }

  const contentType = file.type || 'application/octet-stream';
  const { uploadUrl, logoUrl } = await getUploadUrl(file);

  if (!isStubUploadUrl(uploadUrl)) {
    const response = await fetch(uploadUrl, {
      method: 'PUT',
      body: file,
      headers: { 'Content-Type': contentType },
    });

    if (!response.ok) {
      throw new Error('Failed to upload logo.');
    }
  }

  return logoUrl;
}

export function applyTenantCssVariables(brandColour: string): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.style.setProperty('--brand-colour', brandColour);
  root.style.setProperty('--primary', brandColour);
  root.style.setProperty('--ring', brandColour);
  root.style.setProperty('--sidebar-primary', brandColour);
}
