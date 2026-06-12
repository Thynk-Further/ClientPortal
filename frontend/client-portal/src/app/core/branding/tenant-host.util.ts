const DEFAULT_ROOT_DOMAIN = 'clientportal.app';

export function resolveTenantSlugFromHost(
  hostname: string,
  rootDomain: string = DEFAULT_ROOT_DOMAIN,
): string | null {
  const host = hostname.trim().toLowerCase();
  if (host === '' || host === 'localhost' || host === '127.0.0.1') {
    return null;
  }

  const normalizedRoot = rootDomain.trim().toLowerCase();
  if (host === normalizedRoot) {
    return null;
  }

  const suffix = `.${normalizedRoot}`;
  if (!host.endsWith(suffix)) {
    return null;
  }

  const slug = host.slice(0, host.length - suffix.length);
  if (!isValidSlug(slug)) {
    return null;
  }

  return slug;
}

export function isLocalDevelopmentHost(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  return host === 'localhost' || host === '127.0.0.1' || host.endsWith('.localhost');
}

function isValidSlug(slug: string): boolean {
  if (slug === '' || slug.startsWith('-') || slug.endsWith('-')) {
    return false;
  }

  return /^[a-z0-9-]+$/.test(slug);
}
